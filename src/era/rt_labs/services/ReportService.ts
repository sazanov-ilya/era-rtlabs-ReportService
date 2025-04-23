import { GlobalUtils, Converter, EBaseLogLevel } from "./../../utils";
import { Service } from "./../../platform/core";
import { DataFactory, FilterBuilder } from "../../data/model";

// Доп. импорты
import { IIncomingCall, IIncomingCalls, } from "../model";
import { IncomingCalls, } from "../classes";

// Для отчетов из микросервиса
import { IInvocation, ITimeTables } from "../../platform/model";
import BuilderServices from "../../builder/services/BuilderServices";
import { ESeanceDirection, ESeanceResult, IArchiveConnection, IArchiveConnections, IArchiveSeance, IArchiveSeances, ICurrentACDCall, ICurrentACDCalls, ICurrentConnection, ICurrentConnections, ICurrentSeance, ICurrentSeances, IRecordInfo } from "../../callcenter/model";

// Для работы со звонками
import { EUpdateKind, IBaseEntity, IDataUpdateParams } from "../../base/model";
import { TimeTables } from "../../platform/classes";
import RootUsers from "../../root/classes/iam/RootUsers";
import IRootUsers from "../../root/model/iam/IRootUsers";
import { IUser } from "../../meet/model";
import { IRootUser } from "../../root/model";
import { ACDQueues, ArchiveConnections, ArchiveSeances, CurrentACDCalls, CurrentConnections, CurrentSeances } from "../../callcenter/classes";
//import ISessionInfo from "../../data/model/ISessionInfo";


class ReportService extends Service {
    constructor() {
        super("rt_labs.ReportService");

        // onCreateCode

        // 2. На время разработки дублируем в консоль все, 
        // что пишется в лог до уровня debug
        // Настравается в приложении "Админ платформы" (поиск по имени пакета)
        // по возрастанию степени детализаии:
        // core
        // error
        // warning
        // info
        // trace
        // debug
        this.log.consoleLevel = EBaseLogLevel.debug;

        this.load();
    }

    async onInit() {
        await super.onInit();
        try {

            // onInitCode

            // 1. Вывод сообщения о запуске в консоль
            const message_init: string = '!!! rt_labs -> ReportService.ts -> onInit';
            //console.log(message_init);          
            this.log.info(message_init);

        }
        catch (e) {
            this.log.exception("onInit", e);
        }
    }


    async onTimer() {
        await super.onTimer();
        try {

            // onTimerCode

        }
        catch (e) {
            this.log.exception("onTimer", e);
        }
    }


    // declarationsCode

    // Процедура -> получение пользователя
    //async getUser(userId: string | undefined) {
    async getUserName(userId: string): Promise<string> {
        //this.log.debug('getUser -> userId', userId);

        try {
            const usersTmp: IRootUsers = new RootUsers(this.context);

            // Ищем пользователя в БД, если он есть
            //let filter = FilterBuilder.equals('id', userId);
            //const users = await usersTmp.loadAll({ select: { filter } });
            //if (users.length > 0) {
            //    user = users[0]
            //}

            const user = await usersTmp.getByIDStrong(userId)

            // Возврат
            return user?.name?.toString() ?? 'Нет данных';
        }
        catch (e) {
            this.log.exception('getUser -> exception', e);
            return 'Нет данных';
        }
    }


    // /////////////// //
    // ОЦЕНКА КАЧЕСТВА //
    // /////////////// //

    // Отчет по оценкам качества с ИТОГОВОЙ группировкой 
    async reportRatingGroup(invocation_: IInvocation) {
        //this.log.debug('reportRatingGroup -> invocation_', invocation_);

        try {

            /*
            // ID пользователя
            const user_id = invocation_.request?.user_id;
            // Роли пользователя
            const roles = BuilderServices.builderContext.getUserRoles(user_id);
            */
            /*
            // Минимальный код
            return {
                data: [
                    { id: "123a", name: "123" },
                    { id: "123b", name: "123" },
                    { id: "123c", name: "567" },
                ]
            }
            */
            /*
            // Минимальный код (2)
            const data = [
                { id: "123a", name: "123" },
                { id: "123b", name: "123" },
                { id: "123c", name: "567" },
            ]
    
            return {
                data
            };
            */

            // Интерфейс для категорий оценок
            interface IRatingCategory {
                name: string;
                field: 'timeRating' | 'clarityRating' | 'friendlinessRating' | 'competenceRating';
                data: { r1: number; r2: number; r3: number; r4: number; r5: number };
            }

            // Инициализация всех возможных категорий оценок
            const ratingCategories: IRatingCategory[] = [
                {
                    name: 'Время ожидания ответа оператора',
                    field: 'timeRating',
                    data: { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 }
                },
                {
                    name: 'Доброжелательность оператора',
                    field: 'friendlinessRating',
                    data: { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 }
                },
                {
                    name: 'Компетентность оператора',
                    field: 'competenceRating',
                    data: { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 }
                },
                {
                    name: 'Ясность ответа оператора',
                    field: 'clarityRating',
                    data: { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 }
                }
            ];

            const totals = {
                totalRating: { name: 'Всего оценок', r1: 0, r2: null, r3: null, r4: null, r5: null },
                totalCallWithoutRating: { name: 'Без оценки', r1: 0, r2: null, r3: null, r4: null, r5: null },
                totalCall: { name: 'Всего обращений', r1: 0, r2: null, r3: null, r4: null, r5: null }
            };

            // Загрузка данных
            const ratingsTmp = new IncomingCalls(this.context);
            const interval = [invocation_.request?.parameters?.timeStart, invocation_.request?.parameters?.timeFinish];
            const filter = FilterBuilder.equals("isDialogue", true);
            const ratings = await ratingsTmp.loadAll({ select: { interval, filter } });

            // Обработка данных
            for (const rating of ratings) {
                totals.totalCall.r1++;

                if (rating.isRating) {
                    for (const category of ratingCategories) {
                        const ratingValue = rating[category.field];
                        // Проверка на значение оценки и undefined
                        if (ratingValue !== undefined && ratingValue >= 1 && ratingValue <= 5) {
                            totals.totalRating.r1++;
                            category.data[`r${ratingValue}` as keyof typeof category.data]++;
                        }
                    }
                } else {
                    totals.totalCallWithoutRating.r1++;
                }
            }

            // Формирование результата (все категории, включая те, где все оценки 0)
            const result = [
                ...ratingCategories.map(category => ({
                    name: category.name,
                    ...category.data
                })),
                totals.totalRating,
                totals.totalCallWithoutRating,
                totals.totalCall
            ];
            //this.log.debug('reportRatingGroup -> result', result);

            return { data: result };
        } catch (e) {
            this.log.exception('reportRatingGroup', e);
            return false;
        }
    }



    // Отчет по оценкам качества с группировкой по ОПЕРАТОРАМ
    async reportRatingGroupByOperators(invocation_: IInvocation) {
        this.log.debug('reportRatingGroupByOperators -> invocation_', invocation_);

        try {


            // Интерфейс "Оценки"
            interface IRatingValues {
                r1: number;
                r2: number;
                r3: number;
                r4: number;
                r5: number;
            }

            // Интерфейс "Категории оценок"
            interface IRatingItem {
                name: string;
                values: IRatingValues;
            }

            // Интерфейс "Оценики по оператору"
            interface IRatingsByUser {
                userId: string;
                userName: string;
                ratings: {
                    timeRating: IRatingItem;
                    friendlinessRating: IRatingItem;
                    competenceRating: IRatingItem;
                    clarityRating: IRatingItem;
                };
                countRating: { name: string; value: number };
                countCallWithoutRating: { name: string; value: number };
                countCall: { name: string; value: number };
            }

            // Вспомогательные функции

            // Создание категории оценок
            const createDefaultRating = (name: string): IRatingItem => ({
                name,
                values: { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 }
            });

            // Создание шаблона пользователя
            const createDefaultUser = (userId: string, userName: string): IRatingsByUser => ({
                userId,
                userName,
                ratings: {
                    timeRating: createDefaultRating("Время ожидания ответа оператора"),
                    friendlinessRating: createDefaultRating("Доброжелательность оператора"),
                    competenceRating: createDefaultRating("Компетентность и понимание оператором проблемы пользователя"),
                    clarityRating: createDefaultRating("Ясность ответа оператора")
                },
                countRating: { name: "Всего оценок", value: 0 },
                countCallWithoutRating: { name: "Без оценки", value: 0 },
                countCall: { name: "Всего обращений", value: 0 }
            });

            const processRating = (rating: number, target: IRatingValues) => {
                if (rating >= 1 && rating <= 5) {
                    target[`r${rating}` as keyof IRatingValues]++;
                }
            };

            // Основная логика
            const RatingsByUser: Record<string, IRatingsByUser> = {};

            // Загрузка данных
            const callsTmp = new IncomingCalls(this.context);
            const interval = [invocation_.request?.parameters?.timeStart, invocation_.request?.parameters?.timeFinish];
            const filter = FilterBuilder.equals("isDialogue", true);
            const calls = await callsTmp.loadAll({ select: { interval, filter } });

            // Предварительная инициализация пользователей
            const uniqueUserIds = [...new Set(calls.map(call => call.user_id).filter(Boolean))];
            await Promise.all(uniqueUserIds.map(async userId => {
                if (typeof userId === 'string') {
                    RatingsByUser[userId] = createDefaultUser(userId, await this.getUserName(userId));
                }
            }));


            // Накопление оценок по операторам
            for (const call of calls) {
                const userId = call.user_id;
                if (!userId || typeof userId !== 'string') continue;

                const userData = RatingsByUser[userId];
                userData.countCall.value++;

                // Если есть оценка
                if (call.isRating) {
                    let ratingCount = 0;
                    if (call.timeRating) {
                        processRating(call.timeRating, userData.ratings.timeRating.values);
                        ratingCount++;
                    }
                    if (call.friendlinessRating) {
                        processRating(call.friendlinessRating, userData.ratings.friendlinessRating.values);
                        ratingCount++;
                    }
                    if (call.competenceRating) {
                        processRating(call.competenceRating, userData.ratings.competenceRating.values);
                        ratingCount++;
                    }
                    if (call.clarityRating) {
                        processRating(call.clarityRating, userData.ratings.clarityRating.values);
                        ratingCount++;
                    }
                    userData.countRating.value += ratingCount;
                } else {
                    userData.countCallWithoutRating.value++;
                }
            }

            // Преобразование в выходной формат
            interface IOutputItem {
                userName: string;
                name: string;
                r1: number;
                r2: number | null;
                r3: number | null;
                r4: number | null;
                r5: number | null;
            }

            const result: IOutputItem[] = [];

            for (const userId in RatingsByUser) {
                const { userName, ratings, countRating, countCallWithoutRating, countCall } = RatingsByUser[userId];

                // Добавляем данные по рейтингам
                Object.values(ratings).forEach(rating => {
                    result.push({
                        userName,
                        name: rating.name,
                        r1: rating.values.r1,
                        r2: rating.values.r2,
                        r3: rating.values.r3,
                        r4: rating.values.r4,
                        r5: rating.values.r5
                    });
                });

                // Добавляем счетчики
                [countRating, countCallWithoutRating, countCall].forEach(counter => {
                    result.push({
                        userName,
                        name: counter.name,
                        r1: counter.value,
                        r2: null,
                        r3: null,
                        r4: null,
                        r5: null
                    });
                });
            }

            this.log.debug('reportRatingGroupByOperators -> result', result);
            return { data: result };

        } catch (e) {
            this.log.exception('reportRatingGroupByOperators', e);
            return false;
        }
    }


    // ///////////////////////////// //
    // Отчет по количеству обрашений //
    // (по таблице входящих в ivr) ////
    // /////////////////////////// ////
    async reportIncomingCalls(invocation_: IInvocation) {
        this.log.debug('reportIncomingCalls -> invocation_', invocation_);

        try {
            //console.log(invocation_.request);
            /*
            // ID пользователя
            const user_id = invocation_.request?.user_id;
            // Роли пользователя
            const roles = BuilderServices.builderContext.getUserRoles(user_id);
            */

            //const stringToBoolean = (value: string): boolean => value.toLowerCase() === 'true';
            const stringToBoolean = (value: string | null): boolean | null =>
                value === null ? null : typeof value === 'string' ? value.toLowerCase() === 'true' : null;

            // Интерфейс для структуры отчета о входящих вызовах
            interface ILineReportIncomingCalls {
                interval: string;
                work_count: number;
                off_count: number;
                work_percent: number;
                off_percent: number;
            }


            // Инициализация массива для хранения данных отчета
            let data: ILineReportIncomingCalls[] = [];
            // Счетчики звонков в выходной и рабочий дни
            let totalDyOff = 0;
            let totalDayWork = 0;

            const isBlacklist = invocation_.request?.parameters?.isBlacklist
            this.log.debug('reportIncomingCalls -> isBlacklist:', isBlacklist);

            const incomingCallsTmp = new IncomingCalls(this.context);
            const interval = [invocation_.request?.parameters?.timeStart, invocation_.request?.parameters?.timeFinish];
            //this.log.debug('getReportIncomingCalls -> interval', interval);
            //this.log.debug('getReportIncomingCalls -> filter', filter);

            // Есть идея использования отдельных минифильтров под каждый фильтр
            // const isBlacklistFilter = ["or", ["isnull", ["const", "isBlacklist"]], ["==", ["property", "isBlacklist"], ["bool", ["const", isBlacklist]]]]

            // С учетом признака ЧС
            const isBlacklistFilter = FilterBuilder.equals("isBlacklist", ["const", isBlacklist]);

            // Прлучаем фильтр для выборки данных
            let selectFilter: any
            if (isBlacklist !== null && isBlacklist !== undefined) { // Проверка признака ЧС
                selectFilter = {
                    select: {
                        interval: interval,
                        filter: isBlacklistFilter
                    }
                }
            } else {
                selectFilter = {
                    select: {
                        interval: interval
                    }
                }
            }

            // ///
            /* Рекомендации GPT
            const selectFilter = {
                select: {
                    interval: interval,
                    ...(isBlacklist !== null && isBlacklist !== undefined ? { filter: FilterBuilder.equals("isBlacklist", ["const", isBlacklist]) } : {})
                }
            };
            */
            // ///

            // Данные согласно фильтра
            const incomingCalls = await incomingCallsTmp.loadAll(selectFilter);
            //const incomingCalls = await incomingCallsTmp.loadAll({ select: { interval, filter } });
            //this.log.debug('getReportIncomingCalls -> incomingCalls:', incomingCalls);

            if (incomingCalls.length) { // Формируем отчет

                // Часовые интервалы
                const jsonIntervals = getHourIntervals();
                //this.log.debug('jsonIntervals', jsonIntervals);

                // Преобразуем JSON-строку обратно в объект
                const parsedIntervals = JSON.parse(jsonIntervals);
                //this.log.debug('parsedIntervals', parsedIntervals);

                // Добавляем в отчет все возможные интервалы
                for (const interval of parsedIntervals.intervals) {
                    data.push({ interval: interval, work_count: 0, off_count: 0, work_percent: 0, off_percent: 0 });
                    //console.log(interval);
                };
                //this.log.debug('data', data);


                for (let incomingCall_ of incomingCalls) {

                    // Интервал из даты дате
                    const hourInterval: string = getHourInterval(incomingCall_.insertDttm);
                    //this.log.debug('hourInterval', hourInterval);

                    // Поиск индекса элемента по значению интервала
                    const existsInterval: number = findIndexByInterval(data, hourInterval);
                    //console.log(`!INTERVAL!: ${incomingCall_.callDttm} interval = ${hourInterval} exists = ${existsInterval} `);

                    if (existsInterval !== -1) { // Если интервал найден

                        // Накапливаем дни
                        if (incomingCall_.isNotWorking) { // Выходной
                            data[existsInterval].off_count += 1;
                            totalDyOff = totalDyOff + 1
                        }
                        else { // Рабочий
                            data[existsInterval].work_count += 1;
                            totalDayWork = totalDayWork + 1
                        }
                    }
                };


                // ОБщее число звонков
                const totalCall: number = totalDayWork + totalDyOff
                // Считаем %
                for (let d of data) {
                    d.work_percent = roundToTwoDecimals((d.work_count / divisor(totalCall)) * 100);
                    d.off_percent = roundToTwoDecimals((d.off_count / divisor(totalCall)) * 100);
                };
                // Добавляем итоги
                const total: ILineReportIncomingCalls = {
                    interval: 'Итого:',
                    work_count: totalDayWork,
                    off_count: totalDyOff,
                    work_percent: roundToTwoDecimals((totalDayWork / divisor(totalCall)) * 100),
                    off_percent: roundToTwoDecimals((totalDyOff / divisor(totalCall)) * 100)
                };
                data.push(total);

            }

            else { // Заглушка для пустого отчета
                data = [
                    {
                        "interval": "Нет данных",
                        "work_count": 0,
                        "off_count": 0,
                        "work_percent": 0,
                        "off_percent": 0
                    }
                ]
            };

            // Возврат результата
            return {
                data
            };
        }
        catch (e) {
            this.log.exception('reportIncomingCalls', e);

            return false;

        }
    }


    // functionsCode

}


// Вспомогательные интерфейсы и функции


// Интерфейс с обязательным ключом interval
interface IHasInterval {
    interval: string;
}


// Процедура для поиска индекса по значению interval
function findIndexByInterval<T extends IHasInterval>(arr: T[], search: string): number {
    return arr.findIndex(item => item.interval === search);
}


// Функция возвращает строку времени в формате "01:00:00"
function getFormatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0'); // Получаем часы и добавляем ведущий ноль
    const minutes = '00'; // Минуты
    const seconds = '00'; // Секунды

    return `${hours}:${minutes}:${seconds}`;
}


// Функция форматирования часового интервала
// Пример: "00:00:00 - 01:00:00"
function formatHourInterval(start: string, end: string): string {
    return `${start} - ${end}`; // Форматируем строку интервала
}


// Функция возвращает интервал в формате "00:00:00 - 01:00:00"
function getHourInterval(date: Date): string {
    const start = getFormatTime(date);
    //const end: string = getFormatTime(new Date(date.setHours(date.getHours() + 1)))
    const end = getFormatTime(new Date(date.getTime() + 3600000)); // + 1 час

    return formatHourInterval(start, end);
}


// Функция возвращает JSON со списком часовых интервалов 
// в разрезе суток в формате "00:00:00 - 01:00:00"
function getHourIntervals(): string {
    const intervals: string[] = [];

    for (let hour = 0; hour < 24; hour++) {
        const start = String(hour).padStart(2, '0');
        const end = String((hour + 1) % 24).padStart(2, '0'); // С приведением 23:00:00 -> 00:00:00

        const interval = formatHourInterval(`${start}:00:00`, `${end}:00:00`);
        intervals.push(interval);
    }

    return JSON.stringify({ intervals }); // Возвращаем JSON-строку
}


// Проверка деления на 0
function divisor(n: number) {
    return (n = 0 ? 0.000001 : n);
}


// Округление до сотых
function roundToTwoDecimals(num: number): number {
    return parseFloat(num.toFixed(2));
}


// ///////////////////////////////////////
// Функция для получения интервала по дате
// ///////////////////////////////////////
/*
// Список интервалов
// Не совсем подошел, поскольку строкой нельзя передать значение
// в качестве входящего должно быть значение типа
// const intervalValue: IntervalType = IntervalType.Month
// А следовательно требуется более глобальное создание перечисления 
// (на уровне системных объектов)
// И его использование в качестве фильтра
// НО это не точно)
enum IntervalType {
    Month = 'month',
    Week = 'week',
    Day = 'day',
    Sixty = '60',
    Thirty = '30',
    Fifteen = '15',
    Five = '5'
}
 
function getIntervalName(inputDate: Date, intervalType: IntervalType): string {
../
*/

function getIntervalName(inputDate: Date, intervalType: 'month' | 'week' | 'day' | '60' | '30' | '15' | '5'): string {

    // Создаем копию даты
    const date = new Date(inputDate);

    // Дата с нулевой датой
    const only_date = new Date(date);
    only_date.setHours(0, 0, 0, 0);

    // Дата с нулевым временем
    const only_time = new Date(date);
    date.setFullYear(1900, 0, 1);

    let result: string = ''

    if (intervalType === 'month') {

        //По месяцам 
        // Интервал - первый день месяца в формате
        // 2024-10-01 00:00:00.000
        // Формат для вывода 
        // "Октябрь 2024"

        // Первый день месяца
        const startMonth = new Date(only_date.getFullYear(), only_date.getMonth(), 1);
        /*
        // Последний день месяца
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const endMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());
        */

        // Массив названий месяцев
        const months: string[] = [
            "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
            "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
        ];
        // Получаем месяц и год
        const month = months[startMonth.getMonth()]; // Месяцы начинаются с 0
        const year = startMonth.getFullYear();

        /*
        // Значение интервала
        const intervalDate = startMonth
        */
        // Наименование интервала
        result = `${month} ${year} `;


    } else if (intervalType === 'week') {

        //По неделям 
        // Интервал - первый день недели в формате
        // 2024-10-01 00:00:00.000
        // Формат для вывода 
        // "30.09—06.10"

        // Копируем дату
        const startWeek = new Date(only_date);

        // Получаем день недели (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
        const dayOfWeek = startWeek.getDay();

        // Если воскресенье (0), то возвращаем 6 (суббота)
        // Иначе, просто вычитаем dayOfWeek - 1 (чтобы получить понедельник)
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // Первый день недели (понедельник)
        startWeek.setDate(startWeek.getDate() - daysToSubtract);

        // Последний день недели (воскресенье)
        const endOfWeek = new Date(startWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Добавляем 6 дней для получения воскресенья
        endOfWeek.setHours(23, 59, 59, 999); // Время на 23:59:59.999

        /*
        // Значение интервала
        const intervalDate = startWeek
        */
        // Наименование интервала "30.09—06.10"
        result = startWeek.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }).replace(',', '') + '-' + endOfWeek.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }).replace(',', '');


    } else if (intervalType === 'day') {

        // По дням
        // Интервал - день из даты в формате
        // 2024-10-01 00:00:00.000 
        // Формат для вывода 
        // "01.10.2024"

        // Копируем дату
        const startDay = new Date(only_date);

        /*
        // Значение интервала
        const intervalDate = startDay
        */
        // Наименование интервала "01.10.2024"
        result = startDay.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(',', ''); // Убираем запятую, если она есть


        //} else if (type === '60') {
    } else if (['60', '30', '15', '5'].includes(intervalType)) {

        // Минутные интервалы
        // ...

        // Копируем время
        const timeStart = new Date(only_time);

        // Устанавливаем множитель
        let intMin: number;

        switch (intervalType) {
            case '5':
                intMin = 5;
                break;
            case '15':
                intMin = 15;
                break;
            case '30':
                intMin = 30;
                break;
            case '60':
                intMin = 60;
                break;
            //default:
            //    intMin = 30; // Значение по умолчанию
        }

        // Часовая зона (смещение в минутах)
        const timezoneOffset = timeStart.getTimezoneOffset();

        //// Число минут
        //const countMinutesInDate = (timeStart.getHours() * 60) + timeStart.getMinutes();
        // Округляем минуты до интервала
        const countMinutes = Math.floor(((timeStart.getHours() * 60) + timeStart.getMinutes()) / intMin) * intMin;

        // Создаем базовую дату
        const intervalStart = new Date(0); // 0 - это количество миллисекунд с начала эпохи Unix
        // Время начала интервала
        intervalStart.setMinutes(intervalStart.getMinutes() + countMinutes);

        // Корректируем время на часовую зону (смещение в минутах) 
        intervalStart.setMinutes(intervalStart.getMinutes() + timezoneOffset);

        // Время окончания интервала
        const intervalEnd = new Date(intervalStart);
        intervalEnd.setMinutes(intervalEnd.getMinutes() + intMin); // Увеличиваем минуты

        /*
        // Значение интервала
        const intervalDate = intervalStart
        */
        // Наименование интервала "30.09—06.10"
        result = intervalStart.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(',', '') + '-' + intervalEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }).replace(',', '');

    } else {
        throw new Error("Invalid type.");
    }

    return result; // Возвращаем интервал
}



export default ReportService;