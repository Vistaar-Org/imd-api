# VISTAAR

VISTAAR is a domain specification based on top of Beckn to add support for weather and crop advisory related data.

This domain specification adds the following `MeterologicalForecast` object in the schemas to represent and exchange meterological information as a first class citizen using a Beckn-like communication protocol between the provider and the BPP or client and BAP. This Beckn-like protocol/specification also called the domain specification will then be mapped to the core Beckn specification when the communication happens between the core open network nodes.

```yml
MeterologicalForecast:
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

The `Catalog` object has been updated to include the above `MeterologicalForecast` object.

```diff 
Catalog:
  description: 'Describes the products or services offered by a BPP. This is typically sent as the response to a search intent from a BAP. The payment terms, offers and terms of fulfillment supported by the BPP can also be included here. The BPP can show hierarchical nature of products/services in its catalog using the parent_category_id in categories. The BPP can also send a ttl (time to live) in the context which is the duration for which a BAP can cache the catalog and use the cached catalog.  <br>This has properties like bbp/descriptor,bbp/categories,bbp/fulfillments,bbp/payments,bbp/offers,bbp/providers and exp<br>This is used in the following situations.<br><ul><li>This is typically used in the discovery stage when the BPP sends the details of the products and services it offers as response to a search intent from the BAP. </li></ul>'
  type: object
  properties:
    descriptor:
      $ref: '#/components/schemas/Descriptor'
+    forecast: 
+      $ref: '#/components/schemas/MeterologicalForecast'
    fulfillments:
      description: Fulfillment modes offered at the BPP level. This is used when a BPP itself offers fulfillments on behalf of the providers it has onboarded.
      type: array
      items:
        $ref: '#/components/schemas/Fulfillment'
    payments:
      description: Payment terms offered by the BPP for all transactions. This can be overriden at the provider level.
      type: array
      items:
        $ref: '#/components/schemas/Payment'
    offers:
      description: Offers at the BPP-level. This is common across all providers onboarded by the BPP.
      type: array
      items:
        $ref: '#/components/schemas/Offer'
    providers:
      type: array
      items:
        $ref: '#/components/schemas/Provider'
    exp:
      description: Timestamp after which catalog will expire
      type: string
      format: date-time
    ttl:
      description: Duration in seconds after which this catalog will expire
      type: string
```
