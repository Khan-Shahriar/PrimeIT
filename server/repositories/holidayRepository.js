const { pool } = require("../db");

async function list(filters = {}) {
  const where = [], params = [];
  if (filters.year) { where.push("YEAR(holiday_date)=?"); params.push(filters.year); }
  if (filters.type) { where.push("holiday_type=?"); params.push(filters.type); }
  if (filters.status) { where.push("status=?"); params.push(filters.status); }
  if (filters.search) { where.push("(name LIKE ? OR description LIKE ?)"); const q="%"+filters.search+"%"; params.push(q,q); }
  const sql="SELECT id,name,holiday_date AS date,YEAR(holiday_date) AS year,description,holiday_type AS type,recurring,status,created_by AS createdBy,created_at AS createdAt,updated_at AS updatedAt FROM holidays"+(where.length?" WHERE "+where.join(" AND "):"")+" ORDER BY holiday_date ASC,id ASC";
  const [rows]=await pool.query(sql,params); return rows;
}
async function findById(id){const [rows]=await pool.query("SELECT id,name,holiday_date AS date,YEAR(holiday_date) AS year,description,holiday_type AS type,recurring,status,created_by AS createdBy,created_at AS createdAt,updated_at AS updatedAt FROM holidays WHERE id=? LIMIT 1",[id]);return rows[0]||null}
async function create(data){const [r]=await pool.query("INSERT INTO holidays (name,holiday_date,description,holiday_type,recurring,status,created_by) VALUES (?,?,?,?,?,?,?)",[data.name,data.date,data.description||null,data.type,data.recurring?1:0,data.status,data.createdBy||null]);return findById(r.insertId)}
async function update(id,data){await pool.query("UPDATE holidays SET name=?,holiday_date=?,description=?,holiday_type=?,recurring=?,status=? WHERE id=?",[data.name,data.date,data.description||null,data.type,data.recurring?1:0,data.status,id]);return findById(id)}
async function remove(id){const [r]=await pool.query("DELETE FROM holidays WHERE id=?",[id]);return r.affectedRows>0}
module.exports={list,findById,create,update,remove};