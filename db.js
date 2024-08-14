import { Sequelize } from "sequelize";

const DB_URL = process.env.POSTGRES_URL;

const db = new Sequelize(DB_URL, {
    dialect: "postgres",
    logging: false,
});

export default db;