# README.md

## Установка

1. Клонируйте репозиторий:

   ```
   git clone <URL>
   cd wildberries_boxes
   ```

2. Установите зависимости:

   ```
   npm install
   ```

3. Настройте файл `.env` как в `.env.example`, указав `PG_CONNECTION_STRING` для подключения к базе данных. Иначе будут использоваться стандартные параметры.

## Запуск

Для запуска приложения используйте Docker Compose:

```
docker-compose up
```

## Лицензия

Этот проект лицензирован под лицензией ISC.
