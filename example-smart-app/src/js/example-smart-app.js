async function obtainData(client)  {
  // prepare patient query
  let patientPromise = client.patient.read();
  
  // prepare observation query
  let query = new URLSearchParams();
  query.set("patient", client.patient.id);
  query.set("_count", 5); // fetch fewer pages
  query.set("code", [
    'http://loinc.org|8302-2', // body height
    'http://loinc.org|8462-4', // diastolic blood pressure
    'http://loinc.org|8480-6', // systolic blood pressure
    'http://loinc.org|2085-9', // cholesterol in hdl (high-density lipoprotein)
    'http://loinc.org|2089-1', // cholesterol in ldl (low-density lipoprotein)
    'http://loinc.org|55284-4' // blood pressure
  ].join(","));
  let observationPromise = client.request("Observation?" + query, {
    pageLimit: 0,   // get all pages
    flat     : true // return flat array of Observation resources
  });

  // obtain data
  console.log("Waiting for promise to be fulfilled..");
  const [patientData, observationData] = await Promise.all([patientPromise, observationPromise]);
  console.log("Promise fulfilled.");

  let observationByCodes = client.byCodes(observationData, 'code');

  let patient = {};
  // name
  if (typeof patientData.name[0] !== 'undefined') {
    patient.firstName = patientData.name[0].given.join(' ');
    patient.lastName = patientData.name[0].family;
  }
  // gender
  patient.gender = patientData.gender;
  // birthdate
  patient.birthdate = patientData.birthDate;
  // height
  let height = observationByCodes('8302-2');
  patient.height = getQuantityValueAndUnit(height[0]);
  // blood pressure
  let systolicbp = getBloodPressureValue(observationByCodes('55284-4'),'8480-6');
  if (typeof systolicbp !== 'undefined')  {
    patient.systolicbp = systolicbp;
  }
  let diastolicbp = getBloodPressureValue(observationByCodes('55284-4'),'8462-4');
  if (typeof diastolicbp !== 'undefined') {
    patient.diastolicbp = diastolicbp;
  }
  // cholesterol
  let hdl = observationByCodes('2085-9');
  patient.hdl = getQuantityValueAndUnit(hdl[0]);
  let ldl = observationByCodes('2089-1');
  patient.ldl = getQuantityValueAndUnit(ldl[0]);

  return patient;
}

function displayData(patient) {
  // populate
  $('#fname').html(patient.firstName);
  $('#lname').html(patient.lastName);
  $('#gender').html(patient.gender);
  $('#birthdate').html(patient.birthdate);
  $('#height').html(patient.height);
  $('#systolicbp').html(patient.systolicbp);
  $('#diastolicbp').html(patient.diastolicbp);
  $('#ldl').html(patient.ldl);
  $('#hdl').html(patient.hdl);

  // display
  $('#loading').hide();
  $('#holder').show();
};

function displayError(error) {
  console.log('Loading error:', error);

  $('#loading').hide();
  $('#errors').html('<p> Failed to call FHIR Service </p>');
}

//////////////////////
// utility functions

function getBloodPressureValue(BPObservations, typeOfPressure) {
  let formattedBPObservations = [];
  BPObservations.forEach(function(observation){
    let BP = observation.component.find(function(component){
      return component.code.coding.find(function(coding) {
        return coding.code == typeOfPressure;
      });
    });
    if (BP) {
      observation.valueQuantity = BP.valueQuantity;
      formattedBPObservations.push(observation);
    }
  });

  return getQuantityValueAndUnit(formattedBPObservations[0]);
}

function getQuantityValueAndUnit(ob) {
  if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
        return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}
