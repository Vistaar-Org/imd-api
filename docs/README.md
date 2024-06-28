# VISTAAR

VISTAAR is a domain specification based on top of Beckn to add support for weather and crop advisory related data.

This domain specification adds the following `MeterologicalObservation` object in the schemas to represent and exchange meterological information as a first class citizen using a Beckn-like communication protocol between the provider and the BPP or client and BAP. This Beckn-like protocol/specification also called the domain specification will then be mapped to the core Beckn specification when the communication happens between the core open network nodes.

```yml
MeterologicalObservation:
  description: 'Contains meterological information such as weather forecasts.'
  type: object
  properties:
    date: 
      description: 'Represents the date and time of observation for the meterological forecast.'
      $ref: '#/components/schemas/Time'
    location:
      description: 'Represents the location for which the forecast is made.'
      $ref: '#/components/schemas/Location'
    conditions:
      description: 'Represents the conditions prevailing for the day.'
      type: string
    temperature:
      description: 'Represents the temperature for the given date.'
      $ref: '#/components/schemas/Scalar'
    solar_clock:
      description: 'Sunrise and Sunset related information for the day.'
      $ref: '#/components/schemas/Time'
    lunar_clock:
      description: 'Moonrise and Moonset related information for the day.'
      $ref: '#/components/schemas/Time'
    humidity:
      description: 'Information around humidity.'
      $ref: '#/components/schemas/Scalar'
    precipiration:
      description: 'Represents the rainfall related information'
      $ref: '#/components/schemas/Scalar'
    pressure:
      description: 'Information around sea level pressure etc.'
      $ref: '#/components/schemas/Scalar'
    anemometry:
      description: 'Information around the various aspects of wind such as speed, direction etc.'
      type: object
      properties:
        speed:
          description: 'Represents the speed of the wind.'
          $ref: '#/components/schemas/Scalar'
        direction:
          description: 'Represents the direction of the wind.'
          type: string
    nebulosity:
      description: 'Represents the cloud cover information.'
      $ref: '#/components/schemas/Scalar'
    visibility:
      description: 'Information around visibility during conditions like fog, stroms etc.'
      $ref: '#/components/schemas/Scalar'
    fog:
      description: 'Information around the fog levels.'
      $ref: '#/components/schemas/Scalar'
    warnings:
      description: 'Specific warning issued'
      type: string
```

The `Provider` object has been updated to include the above `MeterologicalObservation` object.

```diff 
 Provider:
       description: Describes the catalog of a business.
       type: object
       properties:
         id:
           type: string
           description: Id of the provider
         descriptor:
           $ref: '#/components/schemas/Descriptor'
         category_id:
           type: string
           description: Category Id of the provider at the BPP-level catalog
         rating:
           $ref: '#/components/schemas/Rating/properties/value'
         time:
           $ref: '#/components/schemas/Time'
         categories:
           type: array
           items:
             $ref: '#/components/schemas/Category'
         fulfillments:
           type: array
           items:
             $ref: '#/components/schemas/Fulfillment'
         payments:
           type: array
           items:
             $ref: '#/components/schemas/Payment'
         locations:
           type: array
           items:
             $ref: '#/components/schemas/Location'
         offers:
           type: array
           items:
             $ref: '#/components/schemas/Offer'
         items:
           type: array
           items:
             $ref: '#/components/schemas/Item'
+        forecast:
+          type: array
+          items:
+            $ref: '#/components/schemas/MeterologicalObservations'
         exp:
           type: string
           description: Time after which catalog has to be refreshed
           format: date-time
         rateable:
           description: Whether this provider can be rated or not
           type: boolean
         ttl:
           description: 'The time-to-live in seconds, for this object. This can be overriden at deeper levels. A value of -1 indicates that this object is not cacheable.'
           type: integer
           minimum: -1
         tags:
           type: array
           items:
             $ref: '#/components/schemas/TagGroup'
```
