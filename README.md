# Sito Esame

## Tecnologie usate
- Node.js
- Express
- MongoDB
- Mongoose
- express-session
- Docker e Docker Compose

## Comunicazione tra host e server
- Il browser dell'host parla con il server Express su `http://localhost:3000`.
- Il server salva i dati su MongoDB tramite Mongoose.
- In Docker Compose il server raggiunge MongoDB con l'host di servizio `mongo`.
- La porta `3000` espone il sito verso l'host, la porta `27017` espone MongoDB se serve.

## Avvio con Docker
```bash
docker compose up --build
```

Poi apri `http://localhost:3000`.
