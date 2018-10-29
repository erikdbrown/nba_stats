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
    wins INTEGER DEFAULT 0,
    draft_round INTEGER,
    pool_team INTEGER,
    FOREIGN KEY (pool_team) REFERENCES pool_teams (id)
);

CREATE TABLE IF NOT EXISTS weeks (
    id SERIAL PRIMARY KEY,
    date DATE
);

CREATE TABLE IF NOT EXISTS standings (
    id SERIAL PRIMARY KEY,
    nba_team INTEGER,
    week INTEGER,
    place INTEGER,
    FOREIGN KEY (nba_team) REFERENCES nba_teams (id),
    FOREIGN KEY (week) REFERENCES weeks (id)
);

CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    api_name VARCHAR(10) NOT NULL,
    refresh_token VARCHAR(200),
    token TEXT
);
`