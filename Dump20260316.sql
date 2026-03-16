CREATE DATABASE  IF NOT EXISTS `controlador_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `controlador_db`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: controlador_db
-- ------------------------------------------------------
-- Server version	9.6.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'd42ad05c-125b-11f1-b314-3024a9eeb89d:1-46';

--
-- Table structure for table `asignaciones_tecnicos`
--

DROP TABLE IF EXISTS `asignaciones_tecnicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asignaciones_tecnicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tecnico_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `sede_id` int DEFAULT NULL,
  `cantidad` int DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tecnico_id` (`tecnico_id`),
  KEY `producto_id` (`producto_id`),
  KEY `sede_id` (`sede_id`),
  CONSTRAINT `asignaciones_tecnicos_ibfk_1` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `asignaciones_tecnicos_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `asignaciones_tecnicos_ibfk_3` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asignaciones_tecnicos`
--

LOCK TABLES `asignaciones_tecnicos` WRITE;
/*!40000 ALTER TABLE `asignaciones_tecnicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `asignaciones_tecnicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consumo_tecnico`
--

DROP TABLE IF EXISTS `consumo_tecnico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consumo_tecnico` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tecnico_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `motivo` enum('averia','instalacion') NOT NULL,
  `descripcion` text,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tecnico_id` (`tecnico_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `consumo_tecnico_ibfk_1` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `consumo_tecnico_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consumo_tecnico`
--

LOCK TABLES `consumo_tecnico` WRITE;
/*!40000 ALTER TABLE `consumo_tecnico` DISABLE KEYS */;
/*!40000 ALTER TABLE `consumo_tecnico` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entradas_stock`
--

DROP TABLE IF EXISTS `entradas_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entradas_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `registrado_por` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `entradas_stock_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `entradas_stock_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entradas_stock`
--

LOCK TABLES `entradas_stock` WRITE;
/*!40000 ALTER TABLE `entradas_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `entradas_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entregas_tecnicos`
--

DROP TABLE IF EXISTS `entregas_tecnicos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entregas_tecnicos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `producto_id` int NOT NULL,
  `tecnico_id` int NOT NULL,
  `cantidad` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `registrado_por` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `producto_id` (`producto_id`),
  KEY `tecnico_id` (`tecnico_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `entregas_tecnicos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  CONSTRAINT `entregas_tecnicos_ibfk_2` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `entregas_tecnicos_ibfk_3` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entregas_tecnicos`
--

LOCK TABLES `entregas_tecnicos` WRITE;
/*!40000 ALTER TABLE `entregas_tecnicos` DISABLE KEYS */;
/*!40000 ALTER TABLE `entregas_tecnicos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text,
  `stock_total` int DEFAULT '0',
  `estado` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `codigo` varchar(50) DEFAULT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `unidad` varchar(50) DEFAULT NULL,
  `stock_minimo` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recojos`
--

DROP TABLE IF EXISTS `recojos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recojos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tecnico_id` int NOT NULL,
  `cliente` varchar(150) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `serie` varchar(100) DEFAULT NULL,
  `estado` enum('pendiente','recogido') DEFAULT 'pendiente',
  `registrado_por` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `comentario` text,
  `foto` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tecnico_id` (`tecnico_id`),
  KEY `registrado_por` (`registrado_por`),
  CONSTRAINT `recojos_ibfk_1` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `recojos_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recojos`
--

LOCK TABLES `recojos` WRITE;
/*!40000 ALTER TABLE `recojos` DISABLE KEYS */;
INSERT INTO `recojos` VALUES (1,4,'Prueba1','Prueba1','Prueba1','recogido',3,'2026-03-16 19:41:53',NULL,NULL),(2,4,'Prueba2','Prueba2','Prueb2','pendiente',3,'2026-03-16 20:24:25',NULL,NULL);
/*!40000 ALTER TABLE `recojos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sedes`
--

DROP TABLE IF EXISTS `sedes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sedes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sedes`
--

LOCK TABLES `sedes` WRITE;
/*!40000 ALTER TABLE `sedes` DISABLE KEYS */;
INSERT INTO `sedes` VALUES (1,'Nueva Cajamarca','Av. Nueva Cajamarca 109',1,'2026-03-16 17:18:06');
/*!40000 ALTER TABLE `sedes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_sede`
--

DROP TABLE IF EXISTS `stock_sede`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_sede` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sede_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `cantidad` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `sede_id` (`sede_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `stock_sede_ibfk_1` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `stock_sede_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_sede`
--

LOCK TABLES `stock_sede` WRITE;
/*!40000 ALTER TABLE `stock_sede` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_sede` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','controlador','tecnico') NOT NULL,
  `sede_id` int DEFAULT NULL,
  `estado` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `sede_id` (`sede_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Jhordan','admin@controlador.com','$2b$10$clv8SvdLbZGpXfW0HKWzHOb7fCkMvTf1I6nSbY3kyS069Wbvj7TYi','admin',NULL,1,'2026-03-09 15:58:42'),(2,'Luis Ken','luis@enet.com','$2b$10$lrSr3Ai8TsnrAUd3jwmoz.gXdMmIJ8RJL.AxvjjE5.rL0j9UjWWRW','admin',NULL,1,'2026-03-16 16:58:24'),(3,'ControladorA','control@enet.com','$2b$10$2d5ZHqSWT/UAWZVTbKF6yexmMyBt5so95mpHaIWxzubx8VJBmh8Kq','controlador',1,1,'2026-03-16 17:57:52'),(4,'Tecnico1','tecnico@enet.com','$2b$10$p0R2FAA3y1Ib2xqV4FAgZOTY/lQkWCUii0rie77rRvCXbfdqnoubC','tecnico',1,1,'2026-03-16 19:19:45');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-16 16:15:34
