module.exports = `
CREATE TABLE IF NOT EXISTS pool_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    wins INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    email VARCHAR(50),
    pool_team INTEGER,
    FOREIGN KEY (pool_team) REFERENCES pool_teams (id)
);

CREATE TABLE IF NOT EXISTS nba_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    short_name VARCHAR(5) NOT NULL,
    wins INTEGER,
    pool_team INTEGER,
    FOREIGN KEY (pool_team) REFERENCES pool_teams (id)
);

CREATE TABLE IF NOT EXISTS wins (
    id SERIAL PRIMARY KEY,
    nba_team INTEGER,
    date DATE,
    FOREIGN KEY (nba_team) REFERENCES nba_teams (id)  
);
`