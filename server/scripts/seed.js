import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { env, REPO_ROOT } from "../src/config/env.js";
import { Config, Glaze, Painting, PotteryItem, User, initIndexes } from "../src/models/index.js";

// Explicit style map (we never parse text for it).
const STYLES = {
  "p-001": "Madhubani", "p-002": "Warli", "p-003": "Tanjore", "p-004": "Pattachitra",
  "p-005": "Kalamkari", "p-006": "Gond", "p-007": "Cheriyal", "p-008": "Rajasthani Miniature",
  "p-009": "Pichwai", "p-010": "Nirmal", "p-011": "Kerala Mural", "p-012": "Oil on Canvas",
};

const imagePath = (url, id) => (/^https?:\/\//i.test(url ?? "") ? url : `/images/${path.basename(String(url || `${id}.jpg`))}`);
const sid = (x) => x.id ?? x.seedId;

function need(cond, msg) {
  if (!cond) throw new Error(`seed.json problem: ${msg}`);
}

// IDEMPOTENT: upsert by stable seedId. Descriptive fields are $set; painting `status` is
// $setOnInsert only, so re-seeding can never reopen a sold painting. Nothing is ever deleted.
export async function runSeed({ quiet = false } = {}) {
  const file = path.join(REPO_ROOT, "seedData", "seed.json");
  const seed = JSON.parse(fs.readFileSync(file, "utf8"));
  need(Array.isArray(seed.paintings) && seed.paintings.length, "paintings[] missing");
  need(Array.isArray(seed.potteryItems) && Array.isArray(seed.glazes), "potteryItems[] / glazes[] missing");
  need(Number.isSafeInteger(seed.mural?.ratePerSqFt), "mural.ratePerSqFt missing");
  need(seed.studioAccount?.email && seed.studioAccount?.password, "studioAccount missing");

  for (const p of seed.paintings) {
    const id = sid(p);
    await Painting.updateOne(
      { seedId: id },
      {
        $set: {
          title: p.title, artist: p.artist, description: p.description ?? "", price: p.price,
          imageUrl: imagePath(p.imageUrl, id), style: STYLES[id] ?? p.style ?? "",
        },
        $setOnInsert: { status: p.status === "sold" ? "sold" : "available" },
      },
      { upsert: true }
    );
  }
  for (const [Model, rows] of [[PotteryItem, seed.potteryItems], [Glaze, seed.glazes]]) {
    for (const row of rows) {
      await Model.updateOne({ seedId: sid(row) }, { $set: { name: row.name ?? row.label } }, { upsert: true });
    }
  }
  await Config.updateOne({ key: "mural" }, { $set: { muralRatePerSqFt: seed.mural.ratePerSqFt, currency: "INR" } }, { upsert: true });

  // Studio user: hash the password only when the user is first inserted.
  const email = seed.studioAccount.email.trim().toLowerCase();
  if (!(await User.exists({ email }))) {
    const passwordHash = await bcrypt.hash(seed.studioAccount.password, env.BCRYPT_ROUNDS);
    await User.updateOne({ email }, { $set: { name: "Studio", role: "studio" }, $setOnInsert: { passwordHash } }, { upsert: true });
  } else {
    await User.updateOne({ email }, { $set: { role: "studio" } });
  }

  const summary = {
    paintings: await Painting.countDocuments(), sold: await Painting.countDocuments({ status: "sold" }),
    potteryItems: await PotteryItem.countDocuments(), glazes: await Glaze.countDocuments(),
    studioUsers: await User.countDocuments({ role: "studio" }),
  };
  if (!quiet) console.log("Seed done:", JSON.stringify(summary));
  return summary;
}

// Run directly: `npm run seed`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await connectDb();
    await initIndexes();
    await runSeed();
    await disconnectDb();
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
}
