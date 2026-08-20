// components/NepaliDatePicker.js
import React, { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-datetime';
import './NepaliDatePicker.css';

import {
    getNepaliMonthDaysComprehensive,
    getCurrentNepaliDate,
    convertBsToAd
} from './NepaliDateUtils';

const NepaliDatePicker = ({
    value,
    onChange,
    placeholder = "YYYY-MM-DD",
    className = "",
    autoFocus = false,
    onKeyDown = null,
    required = false,
    style = {},
    disabled = false,
    dateErrors = {},
    setDateErrors = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentYear, setCurrentYear] = useState(2080);
    const [currentMonth, setCurrentMonth] = useState(1);
    const [days, setDays] = useState([]);
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Nepali month names
    const monthNames = ['Baisakh', 'Jestha', 'Ashad', 'Shrawan', 'Bhadra', 'Ashwin',
        'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];

    // Day names (for reference)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // 🔥 Use comprehensive data for month days
    const getMonthDays = (year, month) => {
        return getNepaliMonthDaysComprehensive(year, month);
    };

    // 🔥 FIXED: Validate Nepali date - ONLY uses static data, NO library validation
    const isValidNepaliDate = (dateStr) => {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

        try {
            const [year, month, day] = dateStr.split('-').map(Number);
            if (month < 1 || month > 12) return false;

            // ✅ ONLY use static data for validation
            const maxDays = getMonthDays(year, month);
            if (day < 1 || day > maxDays) return false;

            // All validations passed
            return true;
        } catch (error) {
            console.warn('Invalid Nepali date:', dateStr, error.message);
            return false;
        }
    };

    // 🔥 Get day of week for a given date (0 = Sunday, 6 = Saturday)
    const getDayOfWeek = (year, month, day) => {
        try {
            // Use NepaliDate library to get day of week
            const nepaliDate = new NepaliDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
            if (nepaliDate && typeof nepaliDate.getDay === 'function') {
                return nepaliDate.getDay();
            }
            return -1;
        } catch {
            return -1;
        }
    };

    // Check if a day is weekend (Sunday or Saturday)
    const isWeekend = (day) => {
        if (!day) return false;
        const dayOfWeek = getDayOfWeek(currentYear, currentMonth, day);
        return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    };

    // Generate calendar days
    const generateCalendar = (year, month) => {
        const totalDays = getMonthDays(year, month);
        const daysArray = [];

        try {
            const firstDay = new NepaliDate(`${year}-${String(month).padStart(2, '0')}-01`);
            const firstDayOfWeek = firstDay.getDay();

            for (let i = 0; i < firstDayOfWeek; i++) {
                daysArray.push(null);
            }

            for (let i = 1; i <= totalDays; i++) {
                daysArray.push(i);
            }
        } catch (error) {
            console.error('Error generating calendar:', error);
        }

        return daysArray;
    };

    // Initialize with current date
    useEffect(() => {
        try {
            const now = new NepaliDate();
            setCurrentYear(now.getYear());
            setCurrentMonth(now.getMonth() + 1);
        } catch (error) {
            console.error('Error getting current date:', error);
        }
    }, []);

    // Update calendar when month/year changes
    useEffect(() => {
        setDays(generateCalendar(currentYear, currentMonth));
    }, [currentYear, currentMonth]);

    // Update input value when prop changes
    useEffect(() => {
        setInputValue(value || '');
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            try {
                const [year, month] = value.split('-').map(Number);
                if (year >= 1970 && year <= 2100 && month >= 1 && month <= 12) {
                    setCurrentYear(year);
                    setCurrentMonth(month);
                }
            } catch {
                const now = new NepaliDate();
                setCurrentYear(now.getYear());
                setCurrentMonth(now.getMonth() + 1);
            }
        }
    }, [value]);

    // Update calendar from ANY input value
    const updateCalendarFromValue = (val) => {
        if (!val) return;

        const parts = val.split('-');
        let year = null;
        let month = null;

        if (parts.length >= 1 && parts[0].length === 4) {
            year = parseInt(parts[0]);
            if (year >= 1970 && year <= 2100) {
                setCurrentYear(year);
            }
        }

        if (parts.length >= 2 && parts[1].length > 0) {
            month = parseInt(parts[1]);
            if (month >= 1 && month <= 12) {
                setCurrentMonth(month);
            }
        }
    };

    // Handle date selection from calendar
    const handleDateClick = (day) => {
        if (day) {
            const bsDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            setInputValue(bsDate);
            onChange(bsDate);
            if (setDateErrors) {
                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
            }
            setIsOpen(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    // Navigate months
    const changeMonth = (delta) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;

        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }

        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    // Check if day is today
    const isToday = (day) => {
        if (!day) return false;
        try {
            const now = new NepaliDate();
            return now.getYear() === currentYear &&
                now.getMonth() + 1 === currentMonth &&
                now.getDate() === day;
        } catch {
            return false;
        }
    };

    // Check if day is selected
    const isSelected = (day) => {
        if (!day || !value) return false;
        return value === `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Format Nepali date mask
    const formatNepaliDateMask = (value) => {
        let digits = value.replace(/\D/g, '');
        if (digits.length > 8) {
            digits = digits.substring(0, 8);
        }
        if (digits.length === 0) {
            return '';
        }
        const year = digits.substring(0, 4);
        const month = digits.length >= 4 ? digits.substring(4, 6) : '';
        const day = digits.length >= 6 ? digits.substring(6, 8) : '';
        let formatted = year;
        if (month) {
            formatted += '-' + month;
        }
        if (day) {
            formatted += '-' + day;
        }
        return formatted;
    };

    // Handle manual input with validation
    const handleInputChange = (e) => {
        const rawValue = e.target.value;
        const cleaned = rawValue.replace(/[^0-9-]/g, '');
        const formattedValue = formatNepaliDateMask(cleaned);

        setInputValue(formattedValue);
        updateCalendarFromValue(formattedValue);
        onChange(formattedValue);
        if (setDateErrors) {
            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
        }
    };

    // Handle input keydown
    const handleInputKeyDown = (e) => {
        // Handle Backspace - ONLY remove digits, NEVER remove hyphens
        if (e.key === 'Backspace') {
            e.preventDefault();

            const input = e.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = input.value;

            if (start !== end) {
                const selectedText = currentValue.substring(start, end);
                const digitCount = (selectedText.match(/\d/g) || []).length;
                let newValue = currentValue.substring(0, start) + currentValue.substring(end);
                let digits = newValue.replace(/-/g, '');
                if (digits.length > 0 && digitCount > 0) {
                    digits = digits.substring(0, digits.length - digitCount);
                }
                newValue = formatNepaliDateMask(digits);
                input.value = newValue;
                updateCalendarFromValue(newValue);
                onChange(newValue);
                if (setDateErrors) {
                    setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                }
                const newCursorPos = Math.min(start, newValue.length);
                input.setSelectionRange(newCursorPos, newCursorPos);
                return;
            }

            const position = start;
            if (position === 0) return;

            const currentDigits = currentValue.replace(/-/g, '');
            let digitIndex = -1;
            if (position <= 4) {
                digitIndex = position - 1;
            } else if (position >= 5 && position <= 7) {
                digitIndex = position - 2;
            } else if (position >= 8) {
                digitIndex = position - 3;
            }

            if (digitIndex < 0 || digitIndex >= currentDigits.length) {
                input.setSelectionRange(position - 1, position - 1);
                return;
            }

            let newDigits = currentDigits.substring(0, digitIndex) + currentDigits.substring(digitIndex + 1);
            let newValue = formatNepaliDateMask(newDigits);
            input.value = newValue;
            updateCalendarFromValue(newValue);
            onChange(newValue);
            if (setDateErrors) {
                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
            }

            let newPos = position - 1;
            if (newPos === 4 && newValue.length > 4) {
                newPos = 4;
            } else if (newPos === 7 && newValue.length > 7) {
                newPos = 7;
            }
            newPos = Math.min(newPos, newValue.length);
            input.setSelectionRange(newPos, newPos);
            return;
        }

        // Handle number input
        if (/^\d$/.test(e.key)) {
            e.preventDefault();

            const input = e.target;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = input.value;
            let digits = currentValue.replace(/-/g, '');

            if (start !== end) {
                const selectedText = currentValue.substring(start, end);
                const digitCount = (selectedText.match(/\d/g) || []).length;
                if (digitCount > 0) {
                    const selectedTextDigits = selectedText.replace(/-/g, '');
                    let digitStart = 0;
                    for (let i = 0; i < start && i < currentValue.length; i++) {
                        if (currentValue[i] !== '-') {
                            digitStart++;
                        }
                    }
                    digits = digits.substring(0, digitStart) + digits.substring(digitStart + selectedTextDigits.length);
                }
            }

            if (digits.length >= 8) {
                return;
            }

            let digitIndex = 0;
            for (let i = 0; i < start && i < currentValue.length; i++) {
                if (currentValue[i] !== '-') {
                    digitIndex++;
                }
            }

            let newDigits = digits.substring(0, digitIndex) + e.key + digits.substring(digitIndex);
            let newValue = formatNepaliDateMask(newDigits);
            input.value = newValue;
            updateCalendarFromValue(newValue);
            onChange(newValue);
            if (setDateErrors) {
                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
            }

            let newPos = start + 1;
            if (newPos === 5 || newPos === 8) {
                newPos++;
            }
            newPos = Math.min(newPos, newValue.length);
            input.setSelectionRange(newPos, newPos);
            return;
        }

        // Handle Enter key - validate and auto-correct if needed
        if (e.key === 'Enter') {
            e.preventDefault();

            const dateStr = inputValue.trim();

            // If empty, set current date
            if (!dateStr) {
                const currentDate = getCurrentNepaliDate();
                setInputValue(currentDate);
                onChange(currentDate);
                updateCalendarFromValue(currentDate);
                if (setDateErrors) {
                    setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                }
                setIsOpen(false);
                if (onKeyDown) {
                    onKeyDown(e);
                }
                return;
            }

            // Check if it's a complete date (YYYY-MM-DD)
            if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                // ✅ Validate the date using static data only
                if (isValidNepaliDate(dateStr)) {
                    // Valid date - keep it and move to next field
                    if (setDateErrors) {
                        setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                    }
                    setIsOpen(false);
                    if (onKeyDown) {
                        onKeyDown(e);
                    }
                    return;
                } else {
                    // Try to auto-correct the date
                    const [year, month, day] = dateStr.split('-').map(Number);
                    if (year && month && day) {
                        const maxDays = getMonthDays(year, month);
                        const correctedDay = Math.min(day, maxDays);
                        const correctedDate = `${year}-${String(month).padStart(2, '0')}-${String(correctedDay).padStart(2, '0')}`;

                        if (isValidNepaliDate(correctedDate)) {
                            // Auto-correct the date
                            setInputValue(correctedDate);
                            onChange(correctedDate);
                            updateCalendarFromValue(correctedDate);
                            if (setDateErrors) {
                                setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                            }
                            setIsOpen(false);
                            if (onKeyDown) {
                                onKeyDown(e);
                            }
                            return;
                        }
                    }
                    // If can't auto-correct, set to current date
                    const currentDate = getCurrentNepaliDate();
                    setInputValue(currentDate);
                    onChange(currentDate);
                    updateCalendarFromValue(currentDate);
                    if (setDateErrors) {
                        setDateErrors(prev => ({ ...prev, nepaliDate: ' ' }));
                    }
                    setIsOpen(false);
                    if (onKeyDown) {
                        onKeyDown(e);
                    }
                    return;
                }
            } else if (dateStr.length > 0 && dateStr.length < 10) {
                // Partial date - try to auto-complete
                const parts = dateStr.split('-');
                let year = parts[0] || '';
                let month = parts[1] || '';
                let day = parts[2] || '';

                if (year.length === 4) {
                    month = month.padStart(2, '0') || '01';
                    day = day.padStart(2, '0') || '01';
                    const completedDate = `${year}-${month}-${day}`;

                    if (isValidNepaliDate(completedDate)) {
                        setInputValue(completedDate);
                        onChange(completedDate);
                        updateCalendarFromValue(completedDate);
                        if (setDateErrors) {
                            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                        }
                        setIsOpen(false);
                        if (onKeyDown) {
                            onKeyDown(e);
                        }
                        return;
                    }
                }
                const currentDate = getCurrentNepaliDate();
                setInputValue(currentDate);
                onChange(currentDate);
                updateCalendarFromValue(currentDate);
                if (setDateErrors) {
                    setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                }
                setIsOpen(false);
                if (onKeyDown) {
                    onKeyDown(e);
                }
                return;
            } else {
                // Invalid format - set to current date
                const currentDate = getCurrentNepaliDate();
                setInputValue(currentDate);
                onChange(currentDate);
                updateCalendarFromValue(currentDate);
                if (setDateErrors) {
                    setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
                }
                setIsOpen(false);
                if (onKeyDown) {
                    onKeyDown(e);
                }
                return;
            }
        }

        // Handle Escape key
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            return;
        }

        // Handle Tab key
        if (e.key === 'Tab') {
            setIsOpen(false);
            return;
        }

        // Prevent other keys
        if (!/^\d$/.test(e.key) &&
            e.key !== '.' &&
            e.key !== '/' &&
            e.key !== 'Backspace' &&
            e.key !== 'Delete' &&
            e.key !== 'Tab' &&
            e.key !== 'Escape' &&
            e.key !== 'Enter' &&
            !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            return;
        }

        // Convert dot and slash
        if (e.key === '.' || e.key === '/') {
            e.preventDefault();
            return;
        }

        // Block manual hyphen
        if (e.key === '-') {
            e.preventDefault();
            return;
        }
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (!disabled) {
            setIsOpen(true);
            if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                try {
                    const [year, month] = value.split('-').map(Number);
                    if (year >= 1970 && year <= 2100 && month >= 1 && month <= 12) {
                        setCurrentYear(year);
                        setCurrentMonth(month);
                    }
                } catch {
                    const now = new NepaliDate();
                    setCurrentYear(now.getYear());
                    setCurrentMonth(now.getMonth() + 1);
                }
            }
        }
    };

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get today's date as string
    const getTodayString = () => {
        try {
            const now = new NepaliDate();
            const year = now.getYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    // Handle today button
    const handleToday = () => {
        const today = getTodayString();
        setInputValue(today);
        onChange(today);
        if (today && /^\d{4}-\d{2}-\d{2}$/.test(today)) {
            const [year, month] = today.split('-').map(Number);
            setCurrentYear(year);
            setCurrentMonth(month);
        }
        if (setDateErrors) {
            setDateErrors(prev => ({ ...prev, nepaliDate: '' }));
        }
        setIsOpen(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <input
                ref={inputRef}
                type="text"
                id="nepaliDate"
                name="nepaliDate"
                className={`form-control form-control-sm no-date-icon ${className}`}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                autoFocus={autoFocus}
                required={required}
                autoComplete="off"
                style={{
                    height: '32px',
                    fontSize: '0.9rem',
                    paddingTop: '0.3rem',
                    paddingBottom: '0.3rem',
                    width: '100%',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    ...style
                }}
                disabled={disabled}
                readOnly={false}
            />

            {isOpen && !disabled && (
                <div className="nepali-calendar-container">
                    <div className="nepali-calendar-header">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="calendar-nav-btn"
                            aria-label="Previous month"
                        >
                            ‹
                        </button>
                        <span className="calendar-month-year">
                            {monthNames[currentMonth - 1] || ''} {currentYear}
                        </span>
                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="calendar-nav-btn"
                            aria-label="Next month"
                        >
                            ›
                        </button>
                    </div>
                    <div className="nepali-calendar-grid">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="calendar-weekday">{day}</div>
                        ))}
                        {days.map((day, index) => {
                            const isWeekendDay = isWeekend(day);
                            const isTodayDay = isToday(day);
                            const isSelectedDay = isSelected(day);
                            
                            let dayClassName = 'calendar-day';
                            if (!day) {
                                dayClassName += ' empty';
                            }
                            if (isTodayDay && !isSelectedDay) {
                                dayClassName += ' today';
                            }
                            if (isSelectedDay) {
                                dayClassName += ' selected';
                            }
                            // 🔥 Add weekend class for Sunday and Saturday
                            if (isWeekendDay && !isSelectedDay) {
                                dayClassName += ' weekend';
                            }

                            return (
                                <div
                                    key={index}
                                    className={dayClassName}
                                    onClick={() => handleDateClick(day)}
                                    role="button"
                                    tabIndex={day ? 0 : -1}
                                    aria-label={day ? `${day} ${monthNames[currentMonth - 1]} ${currentYear}` : ''}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                    <div className="nepali-calendar-footer">
                        <button
                            type="button"
                            onClick={handleToday}
                            className="calendar-today-btn"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="calendar-close-btn"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NepaliDatePicker;