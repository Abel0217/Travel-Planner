import React, { useEffect, useRef, useState } from 'react';

const AutoComplete = ({ id, value, onChange, setIsValid }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const attach = () => {
            if (!window.google?.maps?.places || !inputRef.current || autocompleteRef.current) return;
            autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ['(cities)'],
            });
            autocompleteRef.current.addListener('place_changed', () => {
                const place = autocompleteRef.current.getPlace();
                if (place && place.formatted_address) {
                    setInputValue(place.formatted_address);
                    onChange(place.formatted_address);
                    setIsValid(true);
                }
            });
        };

        attach();
        const timer = setInterval(() => {
            if (autocompleteRef.current) {
                clearInterval(timer);
                return;
            }
            attach();
        }, 200);

        return () => clearInterval(timer);
    }, [onChange, setIsValid]);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const handleBlur = () => {
        if (!inputValue) {
            setIsValid(false);
        }
    };

    const handleChange = (e) => {
        setInputValue(e.target.value);
        setIsValid(false);
    };

    return (
        <input
            id={id}
            ref={inputRef}
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="City"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
        />
    );
};

export default AutoComplete;
