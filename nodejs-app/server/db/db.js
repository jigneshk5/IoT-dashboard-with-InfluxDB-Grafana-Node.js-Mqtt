const Influx = require('influx');

const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'mydb',
    precision: 'rfc3339',
    schema: [
      {
        measurement: ['userdata','nodemcu'],
        fields: {
          toggle_red: Influx.FieldType.INTEGER,
          toggle_green: Influx.FieldType.INTEGER,
          gauge: Influx.FieldType.INTEGER,
          slider: Influx.FieldType.INTEGER,
          line_chart: Influx.FieldType.INTEGER,
        },
        tags: [
          'email',
          'password'
        ]
      }
    ]
   });
   
module.exports= influx;