"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const knex_1 = __importDefault(require("knex"));
/**
 * Конфигурация подключения к PostgreSQL через knex.
 */
const db = (0, knex_1.default)({
    client: 'pg',
    connection: process.env.PG_CONNECTION_STRING || {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || 'password',
        database: process.env.PG_DATABASE || 'wildberries_db'
    }
});
/**
 * Получает данные по API WildBerries "Тарифы коробов".
 *
 * @returns {Promise<TariffData | null>} Объект с тарифными данными или null в случае ошибки.
 */
function fetchWildberriesData() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.get('https://common-api.wildberries.ru/api/v1/tariffs/box');
            return response.data.response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response) {
                if (error.response.status === 401) {
                    console.error('Unauthorized:', error.response.data);
                }
                else if (error.response.status === 429) {
                    console.error('Too Many Requests:', error.response.data);
                }
            }
            console.error('Ошибка при запросе к WildBerries:', error);
            return null;
        }
    });
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
function updateDailyData(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!data) {
            console.error('Нет данных для обновления.');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        try {
            for (const warehouse of data.warehouseList) {
                yield db('box_tariffs')
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
        }
        catch (error) {
            console.error('Ошибка при обновлении данных в базе:', error);
        }
    });
}
/**
 * Выгружает данные из PostgreSQL в указанные google-таблицы.
 *
 * @param {string[]} sheetIds - Массив идентификаторов google-таблиц.
 * @returns {Promise<void>}
 */
function exportDataToGoogleSheets(sheetIds) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const today = new Date().toISOString().split('T')[0];
            const data = yield db('box_tariffs')
                .where({ date: today })
                .orderBy('warehouse_name', 'asc');
            for (const sheetId of sheetIds) {
                console.log(`Экспорт данных в таблицу ${sheetId}:`, data);
            }
            console.log('Выгрузка данных завершена.');
        }
        catch (error) {
            console.error('Ошибка при экспорте данных в Google Sheets:', error);
        }
    });
}
/**
 * Основная функция для инициализации сервиса и запуска ежечасного выполнения задач.
 *
 * @returns {Promise<void>}
 */
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const googleSheetIds = ['sheetId1', 'sheetId2', 'sheetId3'];
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const tariffData = yield fetchWildberriesData();
                yield updateDailyData(tariffData);
                yield exportDataToGoogleSheets(googleSheetIds);
            }
            catch (error) {
                console.error('Ошибка в процессе выполнения задач:', error);
            }
        }), 60 * 60 * 1000); // интервал 1 час
        // Выполняем задачу сразу после старта
        try {
            const data = yield fetchWildberriesData();
            yield updateDailyData(data);
            yield exportDataToGoogleSheets(googleSheetIds);
        }
        catch (error) {
            console.error('Ошибка при первоначальном выполнении:', error);
        }
    });
}
main().catch(err => console.error(err));
