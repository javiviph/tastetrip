export const formatDatetimeLocal = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
};

export const addTimeToTime = (startDatetime, durationSeconds) => {
    if (!startDatetime) return "";
    const date = new Date(startDatetime);
    if (isNaN(date.getTime())) return "";
    date.setSeconds(date.getSeconds() + durationSeconds);
    return formatDatetimeLocal(date);
};

export const subtractTimeFromTime = (endDatetime, durationSeconds) => {
    if (!endDatetime) return "";
    const date = new Date(endDatetime);
    if (isNaN(date.getTime())) return "";
    date.setSeconds(date.getSeconds() - durationSeconds);
    return formatDatetimeLocal(date);
};

export const isPoiOpenAt = (poi, timeStr) => {
    if (!poi.hours || !timeStr) return true;
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return true;
    const nowMins = date.getHours() * 60 + date.getMinutes();

    const [oh, om] = poi.hours.open.split(':').map(Number);
    const [ch, cm] = poi.hours.close.split(':').map(Number);

    const openMins = oh * 60 + om;
    let closeMins = ch * 60 + cm;
    if (closeMins <= openMins) closeMins += 1440;

    return nowMins >= openMins && nowMins <= closeMins;
};

export const formatDisplayDatetime = (datetimeStr, lowercase = false) => {
    if (!datetimeStr) return "";
    const date = new Date(datetimeStr);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    // Reset hours to compare pure calendar days
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const targetStr = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    const diffDays = Math.round((targetStr - todayStr) / (1000 * 60 * 60 * 24));

    let dayPrefix = "";
    if (diffDays === 0) {
        dayPrefix = lowercase ? "hoy " : "Hoy ";
    } else if (diffDays === 1) {
        dayPrefix = lowercase ? "mañana " : "Mañana ";
    } else {
        const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const dayName = weekdays[date.getDay()];
        dayPrefix = `el ${dayName} ${date.getDate()} `;
    }

    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${dayPrefix}a las ${h}:${min}h`;
};
