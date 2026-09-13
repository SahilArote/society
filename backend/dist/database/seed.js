"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDb = seedDb;
const db_1 = require("./db");
async function seedDb() {
    await (0, db_1.initDb)();
    console.log('GreenGate Database is ready.');
}
if (require.main === module) {
    seedDb();
}
