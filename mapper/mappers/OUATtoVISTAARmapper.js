"use strict";
exports.__esModule = true;
exports.transformOUATDataToVISTAAR = void 0;
function transformOUATDataToVISTAAR(ouatData) {
    var weather = [];
    var advisory = [];
    // Weather details
    for (var _i = 0, _a = Object.entries(ouatData.weather_details); _i < _a.length; _i++) {
        var _b = _a[_i], date = _b[0], details = _b[1];
        weather.push({
            date: date,
            location: {
                name: "OUAT Station",
                code: "OUAT",
                lat: "N/A",
                lon: "N/A"
            },
            temperature: {
                max: details.t_max.toString(),
                min: details.t_min.toString()
            },
            humidity: "".concat(details.rh_max, ", ").concat(details.rh_min),
            precipitation: details.rainfall.toString(),
            forecast: {
                description: "N/A"
            },
            wind: {
                speed: details.wind_speed.toString(),
                direction: details.wind_direction.toString()
            },
            solar: {
                Sunset_time: "N/A",
                Sunrise_time: "N/A"
            },
            lunar: {
                Moonrise_time: "N/A",
                Moonset_time: "N/A"
            }
        });
    }
    // Advisory details
    for (var _c = 0, _d = Object.entries(ouatData.crops_data); _c < _d.length; _c++) {
        var _e = _d[_c], crop_name = _e[0], data = _e[1];
        advisory.push({
            crop_name: crop_name,
            crop_advisory: data.advisory
        });
    }
    return { weather: weather, advisory: advisory };
}
exports.transformOUATDataToVISTAAR = transformOUATDataToVISTAAR;
