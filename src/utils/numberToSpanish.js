export function numberToSpanish(num) {
    if (isNaN(num)) return num;
    num = Number(num);

    if (num === 0) return 'cero';
    if (num === 100) return 'cien';

    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas10 = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const veintenas = ['veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const getLess100 = (n) => {
        if (n < 10) return unidades[n];
        if (n < 20) return decenas10[n - 10];
        if (n < 30) return veintenas[n - 20];
        const dec = Math.floor(n / 10);
        const uni = n % 10;
        if (uni === 0) return decenas[dec];
        return decenas[dec] + ' y ' + (uni === 1 ? 'uno' : unidades[uni]);
    };

    const getLess1000 = (n) => {
        if (n < 100) return getLess100(n);
        const cen = Math.floor(n / 100);
        const rest = n % 100;
        if (rest === 0) return centenas[cen];
        return centenas[cen] + ' ' + getLess100(rest);
    };

    if (num < 1000) return getLess1000(num);

    const thousands = Math.floor(num / 1000);
    const rest = num % 1000;

    let res = thousands === 1 ? 'mil' : getLess1000(thousands) + ' mil';
    if (rest > 0) res += ' ' + getLess1000(rest);

    return res.trim();
}
