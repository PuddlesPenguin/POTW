const {Client} = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'tpauskar',
    password: 'Puddles_Penguin1',
    database: 'potw'
});