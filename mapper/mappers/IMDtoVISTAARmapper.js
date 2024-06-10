"use strict";
exports.__esModule = true;
exports.transformIMDDataToVISTAAR = void 0;
var date_fns_1 = require("date-fns");
function calculateDate(baseDate, daysToAdd) {
    var date = new Date(baseDate);
    var newDate = (0, date_fns_1.addDays)(date, daysToAdd);
    return (0, date_fns_1.format)(newDate, 'yyyy-MM-dd');
}
function transformIMDDataToVISTAAR(imdData) {
    var weather = [];
    var advisory = []; // Empty for IMD data
    imdData.forEach(function (station) {
        var baseDate = station.Date;
        // Today's data
        weather.push({
            date: baseDate,
            location: {
                name: station.Station_Name,
                code: station.Station_Code,
                lat: station.Latitude,
                lon: station.Longitude
            },
            temperature: {
                max: station.Today_Max_temp,
                min: station.Today_Min_temp
            },
            humidity: "".concat(station.Relative_Humidity_at_0830, ", ").concat(station.Relative_Humidity_at_1730),
            precipitation: station.Past_24_hrs_Rainfall,
            forecast: {
                description: station.Todays_Forecast
            },
            wind: {
                speed: 'N/A',
                direction: 'N/A'
            },
            solar: {
                Sunset_time: station.Sunset_time,
                Sunrise_time: station.Sunrise_time
            },
            lunar: {
                Moonrise_time: station.Moonrise_time,
                Moonset_time: station.Moonset_time
            }
        });
        // Subsequent days
        for (var dayOffset = 2; dayOffset <= 7; dayOffset++) {
            var dayKeyMax = "Day_".concat(dayOffset, "_Max_Temp");
            var dayKeyMin = "Day_".concat(dayOffset, "_Min_temp");
            var dayKeyForecast = "Day_".concat(dayOffset, "_Forecast");
            if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
                var newDate = calculateDate(baseDate, dayOffset - 1);
                weather.push({
                    date: newDate,
                    location: {
                        name: station.Station_Name,
                        code: station.Station_Code,
                        lat: station.Latitude,
                        lon: station.Longitude
                    },
                    temperature: {
                        max: station[dayKeyMax],
                        min: station[dayKeyMin]
                    },
                    humidity: 'N/A',
                    precipitation: 'N/A',
                    forecast: {
                        description: station[dayKeyForecast]
                    },
                    wind: {
                        speed: 'N/A',
                        direction: 'N/A'
                    },
                    solar: {
                        Sunset_time: station.Sunset_time,
                        Sunrise_time: station.Sunrise_time
                    },
                    lunar: {
                        Moonrise_time: station.Moonrise_time,
                        Moonset_time: station.Moonset_time
                    }
                });
            }
        }
    });
    return { weather: weather, advisory: advisory };
}
exports.transformIMDDataToVISTAAR = transformIMDDataToVISTAAR;
