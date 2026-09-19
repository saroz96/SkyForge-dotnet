function convertToRupeesAndPaisaNepali(amount) {
    const rupees = Math.floor(amount);
    const paisa = Math.round((amount - rupees) * 100);

    let words = '';

    if (rupees > 0) {
        words += numberToWords(rupees) + ' Rupees';
    }

    if (paisa > 0) {
        words += (rupees > 0 ? ' and ' : '') + numberToWords(paisa) + ' Paisa';
    }

    return words || 'Zero Rupees';
}

function numberToWords(num) {
    const ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];

    const tens = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    // Nepali/Indian scale: Thousand → Lakh → Crore → Arab → Kharab
    const scales = ['', 'Thousand', 'Lakh', 'Crore', 'Arab', 'Kharab'];

    // Converts 0–999 into words (Hundred / Tens / Ones)
    function convertHundreds(num) {
        let words = '';

        if (num > 99) {
            words += ones[Math.floor(num / 100)] + ' Hundred ';
            num %= 100;
        }

        if (num > 19) {
            words += tens[Math.floor(num / 10)] + ' ';
            num %= 10;
        }

        if (num > 0) {
            words += ones[num] + ' ';
        }

        return words.trim();
    }

    if (num === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));

    let words = '';

    // Handle the first 3 digits (units / tens / hundreds)
    let firstThree = num % 1000;
    num = Math.floor(num / 1000);

    // Handle remaining digits in groups of 2 (Lakh / Crore pattern)
    let groups = [];
    while (num > 0) {
        groups.push(num % 100);
        num = Math.floor(num / 100);
    }

    // Build from the largest group down
    // groups[0] = Thousand, groups[1] = Lakh, groups[2] = Crore, etc.
    for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] > 0) {
            // Only the first group (Thousand) can be 1-999 style if it's the last remaining
            // Actually, in Nepali system, Thousand can be 0-99, but let's handle up to 99 for Lakh/Crore
            // For Thousand, it can go up to 999 in rare cases (e.g., 999 Thousand)
            if (i === 0) {
                // Thousand can be 1-999
                words += convertHundreds(groups[i]) + ' ' + scales[i + 1] + ' ';
            } else {
                words += convertHundreds(groups[i]) + ' ' + scales[i + 1] + ' ';
            }
        }
    }

    // Add the first 3 digits (ones/tens/hundreds)
    if (firstThree > 0) {
        words += convertHundreds(firstThree) + ' ';
    }

    return words.trim();
}

export default convertToRupeesAndPaisaNepali;