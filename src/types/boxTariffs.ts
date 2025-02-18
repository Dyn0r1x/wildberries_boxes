/**
 * Интерфейс описывает данные по тарифам коробов для конкретного склада.
 */
export interface WarehouseTariff {
  boxDeliveryAndStorageExpr: string;
  boxDeliveryBase: string;
  boxDeliveryLiter: string;
  boxStorageBase: string;
  boxStorageLiter: string;
  warehouseName: string;
}

/**
 * Интерфейс описывает основные данные тарифов.
 */
export interface TariffData {
  dtNextBox: string;
  dtTillMax: string;
  warehouseList: WarehouseTariff[];
}

/**
 * Интерфейс ответа от API WildBerries.
 */
export interface BoxTariffResponse {
  response: {
    data: TariffData;
  };
}