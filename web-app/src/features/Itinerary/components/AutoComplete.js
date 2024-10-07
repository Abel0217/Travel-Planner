import React, { useEffect, useRef, useState } from 'react';

const AutoComplete = ({ id, value, onChange, setIsValid }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const autocompleteRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const loadScript = (url, callback) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.defer = true;
            script.onload = callback;
            document.head.appendChild(script);
        };

        const handleScriptLoad = () => {
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

        if (!window.google) {
            loadScript(`https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`, handleScriptLoad);
        } else {
            handleScriptLoad();
        }
    }, [onChange, setIsValid]);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    const handleBlur = () => {
        // Check if the input value matches the selected value
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
            placeholder="Enter a destination"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
        />
    );
};

export default AutoComplete;
