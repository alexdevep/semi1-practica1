CREATE DATABASE practica1;

USE practica1;

DROP TABLE users;

CREATE TABLE users(
	id int unsigned not null AUTO_INCREMENT,
	usuario varchar(50) not null UNIQUE,
	nombre varchar(200) not null,
	password varchar(50) not null,
	foto varchar(300) not null,
	PRIMARY KEY (id)
);

DESCRIBE users;

SELECT * FROM users;