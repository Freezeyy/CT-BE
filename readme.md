## QuickNode Framework

Simplified the setup of express node

### Installation

1. git clone this repo
2. npm i

### Development

1. Sequelize is setup following this tutorial https://dev.to/nedsoft/getting-started-with-sequelize-and-postgres-emp
1. If sequelize is not installed, globally, can use `npx sequelize-cli <command>`

### ENV RC CONFIG

1. copy the `envrc.example` to `.envrc` ans write your appropriate settings
2. Install [DIRENV](https://direnv.net/docs/installation.html)
3. Run below to activate your env setting

- zsh

```zsh
eval "$(direnv hook zsh)"
direnv allow
```

- bash

```bash
eval "$(direnv hook bash)"
direnv allow
```

### Serve The App

```zsh
npx nodemon
```

### Deploy (e.g. Raspberry Pi + PM2 + Cloudflare)

1. Install dependencies (include dev deps if you run tests; production only needs `npm install` after pulling):
   ```bash
   cd CreditTransfer-BE && npm install
   ```
2. Set `PORT` in `.env` (e.g. `3000` or `3001`) and ensure PM2 / your tunnel points at that port.
3. Verify the API is listening before checking Cloudflare:
   ```bash
   curl -i http://127.0.0.1:$PORT/
   pm2 logs ct-backend --lines 30
   ```
4. A **502 from Cloudflare** usually means the origin is down (crash loop, wrong port, or tunnel misconfigured)—not a CORS issue.
5. Frontend build must use your public API URL:
   ```env
   REACT_APP_API_ORIGIN=https://api.4fource.com
   REACT_APP_API_BASE=https://api.4fource.com/api
   ```

### Database sequlize thingy (SQL)

1. fresh migrate

```zsh
npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all
```

### Model & Seeder (example)

```zsh
npx sequelize-cli model:generate --name Role --attributes name:string
npx sequelize-cli seed:generate --name role
```

### Visualize ERD

```zsh
npm run erd
```
