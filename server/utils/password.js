const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
if (!Number.isInteger(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10 || BCRYPT_ROUNDS > 15) {
    throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15.");
}

async function hashPassword(password) { return bcrypt.hash(password, BCRYPT_ROUNDS); }
async function verifyPassword(password, passwordHash) { return bcrypt.compare(password, passwordHash); }

module.exports = { hashPassword, verifyPassword, BCRYPT_ROUNDS };