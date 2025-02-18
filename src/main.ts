import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import knex, { Knex } from 'knex';
import { BoxTariffResponse, TariffData } from './types/boxTariffs';

/**
 * Конфигурация подключения к PostgreSQL через knex.
 */
const db: Knex = knex({
  client: 'pg',
  connection: process.env.PG_CONNECTION_STRING || {
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE
  }
});

/**
 * Получает данные по API WildBerries "Тарифы коробов".
 *
 * @returns {Promise<TariffData | null>} Объект с тарифными данными или null в случае ошибки.
 */
async function fetchWildberriesData(): Promise<TariffData | null> {
  const date = Date.now().toString()
  try {
    const response = await axios.get<BoxTariffResponse>(
      `https://common-api.wildberries.ru/api/v1/tariffs/box?date=${date}`
    );
    return response.data.response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 401) {
        console.error('Unauthorized:', error.response.data);
      } else if (error.response.status === 429) {
        console.error('Too Many Requests:', error.response.data);
      }
    }
    console.error('Ошибка при запросе к WildBerries:', error);
    return null;
  }
}

/**
 * Обновляет или вставляет данные по тарифам в базу данных.
 *
 * Если данные за сегодня уже существуют для конкретного склада, они будут обновлены.
 * Иначе, создается новая запись.
 *
 * @param {TariffData | null} data - Данные, полученные из API WildBerries.
 * @returns {Promise<void>}
 */
async function updateDailyData(data: TariffData | null): Promise<void> {
  if (!data) {
    console.error('Нет данных для обновления.');
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  try {
    for (const warehouse of data.warehouseList) {
      await db('box_tariffs')
        .insert({
          warehouse_name: warehouse.warehouseName,
          box_delivery_and_storage_expr: warehouse.boxDeliveryAndStorageExpr,
          box_delivery_base: warehouse.boxDeliveryBase,
          box_delivery_liter: warehouse.boxDeliveryLiter,
          box_storage_base: warehouse.boxStorageBase,
          box_storage_liter: warehouse.boxStorageLiter,
          dt_next_box: data.dtNextBox,
          dt_till_max: data.dtTillMax,
          date: today
        })
        .onConflict(['warehouse_name', 'date'])
        .merge();
    }
    console.log('Данные успешно обновлены для', today);
  } catch (error) {
    console.error('Ошибка при обновлении данных в базе:', error);
  }
}

/**
 * Выгружает данные из PostgreSQL в указанные google-таблицы.
 *
 * @param {string[]} sheetIds - Массив идентификаторов google-таблиц.
 * @returns {Promise<void>}
 */
async function exportDataToGoogleSheets(sheetIds: string[]): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await db('box_tariffs')
      .where({ date: today })
      .orderBy('warehouse_name', 'asc');

    for (const sheetId of sheetIds) {
      console.log(`Экспорт данных в таблицу ${sheetId}:`, data);
    }
    console.log('Выгрузка данных завершена.');
  } catch (error) {
    console.error('Ошибка при экспорте данных в Google Sheets:', error);
  }
}

/**
 * Основная функция для инициализации сервиса и запуска ежечасного выполнения задач.
 *
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  const googleSheetIds: string[] = ['sheetId1', 'sheetId2', 'sheetId3'];

  setInterval(async () => {
    try {
      const tariffData = await fetchWildberriesData();
      await updateDailyData(tariffData);
      await exportDataToGoogleSheets(googleSheetIds);
    } catch (error) {
      console.error('Ошибка в процессе выполнения задач:', error);
    }
  }, 60 * 60 * 1000); // интервал 1 час

  // Выполняем задачу сразу после старта
  try {
    const data = await fetchWildberriesData();
    await updateDailyData(data);
    await exportDataToGoogleSheets(googleSheetIds);
  } catch (error) {
    console.error('Ошибка при первоначальном выполнении:', error);
  }
}

main().catch(err => console.error(err));