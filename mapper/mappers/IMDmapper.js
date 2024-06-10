"use strict";
exports.__esModule = true;
exports.transformIMDDataToBeckn = void 0;
var date_fns_1 = require("date-fns");
function calculateDate(baseDate, daysToAdd) {
    var date = new Date(baseDate);
    var newDate = (0, date_fns_1.addDays)(date, daysToAdd);
    return (0, date_fns_1.format)(newDate, 'yyyy-MM-dd');
}
function transformIMDDataToBeckn(imdData) {
    var context = {
        domain: 'string',
        country: 'string',
        city: 'string',
        action: 'search',
        core_version: 'string',
        bap_id: 'string',
        bap_uri: 'string',
        bpp_id: 'string',
        bpp_uri: 'string',
        transaction_id: 'string',
        message_id: 'string',
        timestamp: new Date().toISOString(),
        key: 'string',
        ttl: 'string'
    };
    var items = [];
    imdData.forEach(function (station) {
        var baseDate = station.Date;
        // Today's data
        items.push({
            time: { label: baseDate },
            location_id: station.Station_Code,
            tags: {
                rainfall: station.Past_24_hrs_Rainfall,
                t_max: station.Today_Max_temp,
                t_min: station.Today_Min_temp,
                rh_max: station.Relative_Humidity_at_0830,
                rh_min: station.Relative_Humidity_at_1730,
                wind_speed: '',
                wind_direction: '',
                cloud_cover: '',
                Sunset_time: station.Sunset_time,
                Sunrise_time: station.Sunrise_time,
                Moonset_time: station.Moonset_time,
                Moonrise_time: station.Moonrise_time,
                forecast: station.Todays_Forecast
            }
        });
        // Subsequent days
        for (var dayOffset = 2; dayOffset <= 7; dayOffset++) {
            var dayKeyMax = "Day_".concat(dayOffset, "_Max_Temp");
            var dayKeyMin = "Day_".concat(dayOffset, "_Min_temp");
            var dayKeyForecast = "Day_".concat(dayOffset, "_Forecast");
            if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
                var newDate = calculateDate(baseDate, dayOffset - 1);
                items.push({
                    time: { label: newDate },
                    location_id: station.Station_Code,
                    tags: {
                        rainfall: 'NA',
                        t_max: station[dayKeyMax],
                        t_min: station[dayKeyMin],
                        rh_max: 'NA',
                        rh_min: 'NA',
                        wind_speed: 'NA',
                        wind_direction: 'NA',
                        cloud_cover: 'NA',
                        Sunset_time: station.Sunset_time,
                        Sunrise_time: station.Sunrise_time,
                        Moonset_time: station.Moonset_time,
                        Moonrise_time: station.Moonrise_time,
                        forecast: station[dayKeyForecast]
                    }
                });
            }
        }
    });
    var catalog = {
        providers: [
            {
                items: items
            },
        ]
    };
    var message = {
        catalog: catalog
    };
    return { context: context, message: message };
}
exports.transformIMDDataToBeckn = transformIMDDataToBeckn;
