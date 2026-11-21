# AWS deployment

## EC2 with MySQL or RDS

1. Install Node.js, Python 3, and MySQL client support on the EC2 instance.
2. Upload this project and run `npm install --prefix backend`.
3. Create `backend/.env` from `backend/.env.example`.
4. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `PORT=5000`.
5. Import the project database into local MySQL or Amazon RDS.
6. Start the application with `npm start --prefix backend`.
7. Open TCP port 5000 in the EC2 security group, or put a port-80/443 load balancer or reverse proxy in front of it.
8. For a public HTTPS domain, configure Nginx with a reverse proxy to `127.0.0.1:5000` and install a certificate.

For production process supervision:

```bash
npm install --global pm2
pm2 start backend/server.js --name devsynx
pm2 startup
pm2 save
```

Local development remains supported:

```bash
npm install --prefix backend
npm start --prefix backend
```

Then open `http://localhost:5000`. The frontend and API use the same server origin, so no AWS URL needs to be hard-coded.
