
export const getLocalIsoDate = (date: Date = new Date()) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export const getLocalIsoString = (date: Date = new Date()) => {
    return date.toISOString();
};

export const getCurrentTimestamp = () => new Date().toISOString();

export const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0
    }).format(val);
};
