// Runs before every test file. Tests may only ever touch the *_test database.
process.env.NODE_ENV = "test";
process.env.MONGODB_DB_NAME = "artstudio_test";
