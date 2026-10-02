import React from 'react';
import Suggest from './formKit/Suggest';
import { airportLabel, airportPlace, searchAirports } from '../../../utils/airportSearch';

// Type a code (YYZ), a city (Toronto) or a name (Pearson) and pick the airport.
// Works offline, so it does not need Google.
const search = async (text) => searchAirports(text, 8).map((airport) => ({
    key: airport.code,
    badge: airport.code,
    title: airport.name,
    detail: airportPlace(airport),
    value: airportLabel(airport),
    data: airport,
}));

function AirportSuggest({ value, onChange, placeholder, id, required = true, onPick }) {
    return (
        <Suggest
            id={id}
            value={value}
            onChange={onChange}
            onPick={onPick}
            search={search}
            placeholder={placeholder}
            required={required}
            minChars={2}
            delay={120}
        />
    );
}

export default AirportSuggest;
