// nepaliDateUtils.js
// 🔥 STATIC NEPALI CALENDAR DATA - Most reliable approach
export const getNepaliMonthDays = (year, month) => {
    // Base month days
    const monthDays = {
        1: 31,  // Baisakh
        2: 31,  // Jestha
        3: 32,  // Ashad
        4: 32,  // Shrawan
        5: 31,  // Bhadra
        6: 31,  // Ashwin
        7: 30,  // Kartik
        8: 29,  // Mangsir
        9: 30,  // Poush
        10: 29, // Magh
        11: 30, // Falgun
        12: 30  // Chaitra
    };

    // 🔥 Special years for Ashad (month 3)
    if (month === 3) {
        const ashad31Years = [2078, 2079, 2082, 2086, 2087];
        return ashad31Years.includes(year) ? 31 : 32;
    }

    // 🔥 Special years for Shrawan (month 4)
    if (month === 4) {
        const shrawan31Years = [2078, 2079, 2082, 2083, 2086, 2087];
        return shrawan31Years.includes(year) ? 31 : 32;
    }

    // 🔥 Falgun (month 11) - leap year check
    if (month === 11) {
        const isLeapYear = (year + 1) % 4 === 0;
        return isLeapYear ? 30 : 29;
    }

    return monthDays[month] || 30;
};

// 🔥 More comprehensive data - full year-by-year lookup
export const getNepaliMonthDaysComprehensive = (year, month) => {
    const yearData = {
        2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2079: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2080: [31, 31, 32, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2081: [31, 31, 32, 32, 31, 31, 30, 29, 30, 29, 29, 30],
        2082: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
        2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 29, 30],
        2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
        2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2087: [31, 31, 32, 31, 31, 31, 30, 30, 30, 30, 30, 30],
        2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
        2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
        2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
        2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
        2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
        2097: [31, 32, 31, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
        2099: [31, 31, 32, 31, 31, 31, 30, 29, 29, 30, 30, 30],
    };

    if (yearData[year] && yearData[year][month - 1]) {
        return yearData[year][month - 1];
    }

    return getNepaliMonthDays(year, month);
};

// 🔥 Validate Nepali date - ONLY uses static data, NO library dependency
export const isValidNepaliDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

    try {
        const [year, month, day] = dateStr.split('-').map(Number);

        if (year < 1970 || year > 2100) return false;
        if (month < 1 || month > 12) return false;

        const maxDays = getNepaliMonthDaysComprehensive(year, month);
        if (day < 1 || day > maxDays) return false;

        return true;
    } catch (error) {
        console.warn('Invalid Nepali date:', dateStr, error.message);
        return false;
    }
};

// 🔥 Get day of week for a date
const getDayOfWeek = (year, month, day) => {
    // Reference date: 2080-01-01 is Sunday (0 = Sunday, 1 = Monday, ...)
    const refYear = 2080;
    const refMonth = 1;
    const refDay = 1;
    const refDayOfWeek = 0; // Sunday

    // Calculate total days difference
    let totalDays = 0;

    // Add days from years
    for (let y = refYear; y < year; y++) {
        for (let m = 1; m <= 12; m++) {
            totalDays += getNepaliMonthDaysComprehensive(y, m);
        }
    }

    // Add days from months in current year
    for (let m = 1; m < month; m++) {
        totalDays += getNepaliMonthDaysComprehensive(year, m);
    }

    // Add days from current month
    totalDays += day - 1;

    return (refDayOfWeek + totalDays) % 7;
};

// 🔥 Convert BS to AD - MANUAL conversion using static data
export const convertBsToAd = (bsDate) => {
    if (!bsDate || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate)) return null;

    try {
        const [year, month, day] = bsDate.split('-').map(Number);

        // Validate the BS date first
        if (!isValidNepaliDate(bsDate)) {
            console.error('Invalid BS date:', bsDate);
            return null;
        }

        // Reference: 2080-01-01 (BS) = 2023-04-14 (AD)
        const refBsYear = 2080;
        const refBsMonth = 1;
        const refBsDay = 1;
        const refAdYear = 2023;
        const refAdMonth = 4; // April
        const refAdDay = 14;

        // Calculate days difference between the BS date and reference
        let totalDays = 0;

        // Add days from years
        for (let y = refBsYear; y < year; y++) {
            for (let m = 1; m <= 12; m++) {
                totalDays += getNepaliMonthDaysComprehensive(y, m);
            }
        }

        // Add days from months in current year
        for (let m = 1; m < month; m++) {
            totalDays += getNepaliMonthDaysComprehensive(year, m);
        }

        // Add days from current month
        totalDays += day - 1;

        // Add totalDays to reference AD date
        const adDate = new Date(refAdYear, refAdMonth - 1, refAdDay);
        adDate.setDate(adDate.getDate() + totalDays);

        const adYear = adDate.getFullYear();
        const adMonth = String(adDate.getMonth() + 1).padStart(2, '0');
        const adDay = String(adDate.getDate()).padStart(2, '0');

        return `${adYear}-${adMonth}-${adDay}`;
    } catch (error) {
        console.error('Error converting BS to AD:', error.message, 'Date:', bsDate);
        return null;
    }
};

// 🔥 Convert AD to BS
export const convertAdToBs = (adDate) => {
    if (!adDate) return null;

    try {
        let date;
        if (typeof adDate === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(adDate)) {
                date = new Date(adDate + 'T00:00:00');
            } else {
                date = new Date(adDate);
            }
        } else if (adDate instanceof Date) {
            date = adDate;
        } else {
            return null;
        }

        if (isNaN(date.getTime())) {
            console.error('Invalid AD date:', adDate);
            return null;
        }

        // Reference: 2023-04-14 (AD) = 2080-01-01 (BS)
        const refAdYear = 2023;
        const refAdMonth = 4; // April
        const refAdDay = 14;
        const refBsYear = 2080;
        const refBsMonth = 1;
        const refBsDay = 1;

        const refDate = new Date(refAdYear, refAdMonth - 1, refAdDay);
        const targetDate = new Date(date);

        // Calculate days difference
        const diffTime = targetDate.getTime() - refDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            console.error('AD date is before reference date:', adDate);
            return null;
        }

        // Add diffDays to BS reference date
        let bsYear = refBsYear;
        let bsMonth = refBsMonth;
        let bsDay = refBsDay + diffDays;

        // Normalize the BS date
        while (true) {
            const maxDays = getNepaliMonthDaysComprehensive(bsYear, bsMonth);
            if (bsDay <= maxDays) {
                break;
            }
            bsDay -= maxDays;
            bsMonth++;
            if (bsMonth > 12) {
                bsMonth = 1;
                bsYear++;
            }
        }

        return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error converting AD to BS:', error.message, 'Date:', adDate);
        return null;
    }
};

// 🔥 Get current Nepali date - using system date and converting to BS
export const getCurrentNepaliDate = () => {
    try {
        const today = new Date();
        // Convert today's AD date to BS using convertAdToBs
        const adDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const bsDate = convertAdToBs(adDateStr);
        return bsDate || '2080-01-01';
    } catch (error) {
        console.error('Error getting current Nepali date:', error);
        return '2080-01-01';
    }
};