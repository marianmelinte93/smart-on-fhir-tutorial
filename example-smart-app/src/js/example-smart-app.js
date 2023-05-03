(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    FHIR.oauth2.ready()
      .then(client => { onReady(client, ret); } )
      .catch(error => { onError(error, ret); } );

    return ret.promise();
  }

  function onReady(client, ret)  {
    console.log("client", client);
    console.log("ret", ret);
    var pt = client.patient;
    
    var query = new URLSearchParams();
    query.set("patient", client.patient.id);
    query.set("_count", 5); // Try this to fetch fewer pages
    query.set("code", [
      'http://loinc.org|8302-2', // Body height
      'http://loinc.org|8462-4',
      'http://loinc.org|8480-6',
      'http://loinc.org|2085-9',
      'http://loinc.org|2089-1',
      'http://loinc.org|55284-4'
    ].join(","));
    var obv = client.request("Observation?" + query, {
      pageLimit: 0,   // get all pages
      flat     : true // return flat array of Observation resources
    });

    console.log("pt", pt);
    console.log("obv", obv);

    // $.when(pt, obv).fail(() => { onError(ret); });

    $.when(pt, obv).done((pt, obv, ret) => function(patient, observation, ret) {
      console.log("patient", patient);
      console.log("observation", observation);
      console.log("ret", ret);

      var byCodes = patient.byCodes(observation, 'code');
      var gender = patient.gender;

      var fname = '';
      var lname = '';

      if (typeof patient.name[0] !== 'undefined') {
        fname = patient.name[0].given.join(' ');
        lname = patient.name[0].family.join(' ');
      }

      var height = byCodes('8302-2');
      var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
      var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
      var hdl = byCodes('2085-9');
      var ldl = byCodes('2089-1');

      var p = defaultPatient();
      p.birthdate = patient.birthDate;
      p.gender = gender;
      p.fname = fname;
      p.lname = lname;
      p.height = getQuantityValueAndUnit(height[0]);

      if (typeof systolicbp != 'undefined')  {
        p.systolicbp = systolicbp;
      }

      if (typeof diastolicbp != 'undefined') {
        p.diastolicbp = diastolicbp;
      }

      p.hdl = getQuantityValueAndUnit(hdl[0]);
      p.ldl = getQuantityValueAndUnit(ldl[0]);

      ret.resolve(p);
    });
  }

  function onError(error, ret) {
    console.log('Loading error:', error);
    ret.reject();
  }

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
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

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };

})(window);
