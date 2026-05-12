# Перенесення PostgreSQL та файлів між комп’ютерами (VITA-Edu)

Усе необхідне лежить у каталозі **`database-transfer/`** у корені репозиторію.

## Що тут є

| Файл | Призначення |
|------|-------------|
| `lib/parse-database-url.mjs` | Зчитує `DATABASE_URL` з `backend/.env` і виводить JSON (використовується скриптами). |
| `backup.ps1` / `backup.sh` | Резервна копія бази (**pg_dump**, формат `custom` або SQL). |
| `restore.ps1` / `restore.sh` | Відновлення з `.dump`. |
| `backup-uploads.ps1` | ZIP каталогу `backend/uploads`. |
| `restore-uploads.ps1` | Розпакування ZIP у `backend/uploads` (старі файли → `uploads.bak-<час>`). |
| `backups/` | Сюди потрапляють дампи (у git не потрапляє, лише `.gitkeep`). |
| `upload-archives/` | Архіви файлів студентів/завантажень. |

**Потрібно:** встановлений [Node.js](https://nodejs.org/) (читання `.env`), у **PATH** — утиліти PostgreSQL (**`pg_dump`**, **`pg_restore`**, **`psql`**). На Windows їх ставить установщик PostgreSQL (компонент *Command Line Tools*).

---

## Перед першим запуском

1. Склонуй проєкт і скопіюй `backend/.env` на новій машині (або переспробуй із `.env.example`, якщо він у репозиторії).
2. У `.env` коректний `DATABASE_URL`:
   ```text
   DATABASE_URL="postgresql://КОРИСТУВАЧ:ПАРОЛЬ@хост:5432/назва_бази"
   ```
   На новій машіні допустимо **інший** пароль або ім’я БД — тоді **відновлення** робиш у базу з URL з **нової** машини.

---

## A. Зняти резервну копію (старий комп’ютер)

### Windows (PowerShell)

Із каталогу `database-transfer` (або з будь-якої теки):

```powershell
cd E:\шлях\до\V4\database-transfer
.\backup.ps1
```

Опціонально:

- Інший `.env`:
  ```powershell
  .\backup.ps1 -EnvFile "E:\path\backend\.env"
  ```
- Текстовий SQL замість бінарного:
  ```powershell
  .\backup.ps1 -Format plain
  ```
- Якщо `pg_dump` не у PATH — вкажи каталог bin PostgreSQL:
  ```powershell
  .\backup.ps1 -PgBin "C:\Program Files\PostgreSQL\16\bin"
  ```

Файл з’явиться в `database-transfer/backups/` (наприклад `vita-edu-20260512-143000.dump`).

### Linux / macOS / Git Bash

```bash
cd /path/to/V4/database-transfer
chmod +x backup.sh
./backup.sh
# або явний шлях до .env:
./backup.sh /path/to/backend/.env
```

Текстовий дамп:

```bash
FORMAT=plain ./backup.sh
```

Архів завантажених файлів (підпроєкти студентів):

```powershell
.\backup-uploads.ps1
```

Архів потрапить у `upload-archives/uploads-<дата-час>.zip`.

**Перенесення:** скопіюй файли з `backups/` і `upload-archives/` на новий ПК (флешка, хмара, архів тощо). У git їх краще не комітити.

---

## B. Новий комп’ютер: порожня база лише під проєкт

1. Створи користувача й базу в PostgreSQL або використай уже існуючу порожню БД.
2. У `backend/.env` вистав ту саму базу й креденшіли для **нової** машини.
3. У каталозі `backend` виконай міграції Prisma та (за потреби) наповни демо-даними:
   ```bash
   cd backend
   npm install
   npx prisma migrate deploy
   npm run prisma:seed
   ```
   Сід (`prisma/seed-full.ts`) **очищає таблиці** перед вставкою — для «живої» бази з реальними користувачами **не використовуй** сид без окремої згоди.

Цей сценарій не використовує `restore.ps1`; він лише відновлює **однаковий набір таблиць** як у репозиторії.

---

## C. Новий комп’ютер: відновити **ту саму** базу з бекапу

1. Склонуй проєкт, створи базу під ім’я з **нового** `.env`.
2. Склади дамп і (за потреби) ZIP із uploads у `database-transfer/backups/` та `upload-archives/`.

### Windows

```powershell
cd E:\шлях\до\V4\database-transfer

# Створити БД в PostgreSQL, якщо її ще немає:
.\restore.ps1 -DumpFile .\backups\vita-edu-YYYYMMDD-HHmmss.dump -CreateDatabase

# Якщо базу вже створено вручну:
.\restore.ps1 -DumpFile .\backups\vita-edu-YYYYMMDD-HHmmss.dump

# За потреби:
.\restore.ps1 -DumpFile ... -PgBin "C:\Program Files\PostgreSQL\16\bin"
```

Файли:

```powershell
.\restore-uploads.ps1 -ZipFile .\upload-archives\uploads-YYYYMMDD-HHmmss.zip
```

### Linux / macOS

Створити БД при потребі (одноразово):

```bash
export CREATE_DB=1
./restore.sh /path/to/vita-edu-xxxx.dump /path/to/backend/.env
```

Без створення БД:

```bash
./restore.sh /path/to/vita-edu-xxxx.dump
```

Якщо після відновлення щось підозріле до міграцій:

```bash
cd backend && npx prisma migrate status
```

---

## Якщо робив дамп як **plain SQL** (`-Format plain`)

`restore.ps1` / `restore.sh` розраховані на **custom** формат (`.dump`).

Для файлу `.sql`:

```powershell
# Підстанов змінних з DATABASE_URL через psql або вручну:
psql -h localhost -p 5432 -U КОРИСТУВАЧ -d НАЗВА_БД -f .\backups\vita-edu-xxxxx.sql
```

---

## Docker

Якщо Postgres у контейнері:

- Або ставиш `DATABASE_URL` на `localhost:порт`, проброшений із контейнера, і використовуєш ті самі скрипти на хості (де встановлено `pg_dump`).
- Або виконуєш **`docker exec`** з `pg_dump` / `pg_restore` всередині образу `postgres` — шлях тоді схожий, але хост/host у URL може бути `localhost` із точки зору контейнерної мережі. Найпростіше для переїзду: зняти дамп із хосту на проброшеному порту **`5432:5432`** як для звичайного Postgres.

Файловий том uploads у Docker описаний як `uploads`; на диск хоста це або named volume — тоді на старій машіні роби архів уже з робочої копії `backend/uploads` після синхронізації, або бекап тому через `docker run --rm -v project_uploads:/data ...`.

---

## Безпека

- Файли `.dump` та `.zip` містять **персональні дані** і паролі-сумісний вміст — не публікують і не кладуть у публічний репозиторій.
- Каталог `backups/` і `upload-archives/` уже в `.gitignore` цього набору.

---

## Короткий чекліст переїзду

1. Старий ПК: `.\backup.ps1`, `.\backup-uploads.ps1`.
2. Скопіювати дамп + zip + код + `backend/.env` (**без прод-паролів у загальному доступі**).
3. Новий ПК: PostgreSQL, `.env`, `npx prisma migrate deploy` лише якщо не робиш повний restore; при повному restore — спочатку `restore.ps1`, потім за потреби `prisma migrate status`.
4. `.\restore-uploads.ps1`, якщо були вкладення у `backend/uploads`.

Як щось упирається в версію PostgreSQL або права доступу — при відновленні між різними мажорами PG інколи допомагає plain SQL дамп або оновлення сервера на новій машині під ту саму мажорну версію, що була при `pg_dump`.
