import fetch, { FormData, File } from 'node-fetch';
import * as fs from 'fs';

/*

To use in your application:
- Update username and access token (must have tilesets permissions)
- Update the referenced file
- Update the properties to shift over from the original file
- Update the file name for the tileset

*/

const mapbox_username = "mapstertech";
const mapbox_access_token = "sk.eyJ1IjoibWFwc3RlcnRlY2giLCJhIjoiY2xhOGczNjlmMDAzbTN2b3p5bjFqdTgzayJ9.4RC27Sb20IK-lTm1BVg2-g";

const geoJSONFile = "./gz_2010_us_050_00_500k.json"

const filename = "us_counties"
const tileset_source = filename + '_source';
const tileset_source_layer = filename + '_source_layer';
const tileset = mapbox_username + '.' + filename + '_layer';
const tilesetName = filename;

const createOrUpdate = 'create' // change to update if you've already made the tileset

fs.readFile(geoJSONFile, 'utf8', (err, data) => {
  const dataParsed = JSON.parse(data);

  // let featureCollection = { type : "geojson", features : [] }
  let delimitedGeoJSON = []
  dataParsed.features.forEach(shape => {
    delimitedGeoJSON.push(JSON.stringify(shape))
  })
  let jsonAsString = delimitedGeoJSON.join('\n');

  if(createOrUpdate === 'create') {
    createTilesetAndTilesetSource(jsonAsString, tileset_source, tileset_source_layer, tileset, tilesetName)
  } else {
    updateTilesetAndTilesetSource(jsonAsString, tileset_source, tileset)
  }

  // Use this if you need to write out the delimited geoJSON for some reason
  // fs.writeFile('./output_geojson.json', JSON.stringify(featureCollection), err => {
  //   if (err) {
  //     console.error(err);
  //   }
  //   console.log("DONE WRITING")
  // });

  function makeFormData(json) {
    const formData = new FormData()
    const buffer = Buffer.from(json);
    const file = new File([buffer], 'upload.json')
    formData.set('file', file, 'upload.json')
    return formData;
  }

  function createTilesetAndTilesetSource(json, tileset_source, tileset_source_layer, tileset, tilesetName) {

      const formData = makeFormData(json);

      // Creates a new tileset source
      fetch(`https://api.mapbox.com/tilesets/v1/sources/${mapbox_username}/${tileset_source}?access_token=${mapbox_access_token}`, {
        method : "POST",
        body : formData
      }).then(resp => resp.json()).then(resp => {
        console.log("tileset source created");
        console.log(resp);

        // Creates a new tileset
        const recipe = { version : 1, layers : {}}
        recipe.layers[tileset_source_layer] = {
          "source": `mapbox://tileset-source/${mapbox_username}/${tileset_source}`,
          "minzoom": 1,
          "maxzoom": 10
        }
        fetch(`https://api.mapbox.com/tilesets/v1/${tileset}?access_token=${mapbox_access_token}`, {
          method : "POST",
          headers : {
            "Content-Type" : "application/json"
          },
          body : JSON.stringify({
            recipe : recipe,
            name : tilesetName
          })
        }).then(resp => resp.json()).then(resp => {
          console.log("tileset created")
          console.log(resp);

          // Updates the tileset that uses this tileset source
          // Needs a bit of timeout so it registers it's actually created
          setTimeout(() => {
            fetch(`https://api.mapbox.com/tilesets/v1/${tileset}/publish?access_token=${mapbox_access_token}`, {
              method : "POST"
            }).then(resp => resp.json()).then(resp => {
              console.log("tileset published");
              console.log(resp);
              // may want to delete the tileset here
            })
          }, 5000)
        })
      });
  }

  function updateTilesetAndTilesetSource(json, tileset_source, tileset) {

      const formData = makeFormData(json);

      // Replaces the existing tileset source
      fetch(`https://api.mapbox.com/tilesets/v1/sources/${mapbox_username}/${tileset_source}?access_token=${mapbox_access_token}`, {
        method : "PUT",
        body : formData
      }).then(resp => resp.json()).then(resp => {
        console.log("tileset source updated");
        console.log(resp);

        // Updates the tileset that uses this tileset source
        fetch(`https://api.mapbox.com/tilesets/v1/${tileset}/publish?access_token=${mapbox_access_token}`, {
          method : "POST"
        }).then(resp => resp.json()).then(resp => {
          console.log("tileset published");
          console.log(resp);
        })
      })
  }

})
