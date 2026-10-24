import { User, publicUser } from "./User.js";
import { Painting } from "./Painting.js";
import { Order } from "./Order.js";
import { WallBooking } from "./WallBooking.js";
import { PotteryRequest } from "./PotteryRequest.js";
import { PotteryItem, Glaze, Config } from "./Catalog.js";

export { User, publicUser, Painting, Order, WallBooking, PotteryRequest, PotteryItem, Glaze, Config };
export const models = { User, Painting, Order, WallBooking, PotteryRequest, PotteryItem, Glaze, Config };

// Mongoose builds indexes asynchronously; awaiting init() makes sure they exist
// BEFORE the first request (the uniqueness guarantees depend on them).
export async function initIndexes() {
  await Promise.all(Object.values(models).map((m) => m.init()));
}
