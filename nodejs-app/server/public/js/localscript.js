var ctx = document.getElementById('myChart').getContext('2d');
var id= $('#variableJSON1').text();

$(function(){  
    $('#green').change(function(){                             
        if($(this).prop('checked')){
            console.log("Green checked");
            $.ajax({
              method: "POST",
              url: "http://localhost:8086/write?db=mydb",
              data: `nodemcu,id=${id},type=static green_led=1`
            })
              .done(function( msg ) {
                console.log( "Green ON post");
              });
        }else{
            console.log("Unchecked");
            $.ajax({
              method: "POST",
              url: "http://localhost:8086/write?db=mydb",
              data: `nodemcu,id=${id},type=static green_led=0`
            })
              .done(function( msg ) {
                console.log( "Green OFF post");
              });
        }
    });
    $('#red').change(function(){
        if($(this).prop('checked')){
            console.log("RED checked");
            $.ajax({
              method: "POST",
              url: "http://localhost:8086/write?db=mydb",
              data: `nodemcu,id=${id},type=static red_led=1`
            })
              .done(function( msg ) {
                console.log( "Red ON post");
              });
        }else{
            console.log("Unchecked");
            $.ajax({
              method: "POST",
              url: "http://localhost:8086/write?db=mydb",
              data: `nodemcu,id=${id},type=static red_led=0`
            })
              .done(function( msg ) {
                console.log( "Red Off post");
              });
        }
    });
    $('#slider').change(function(){
        $("#sliderval").html( $(this).val());

        $.ajax({
          method: "POST",
          url: "http://localhost:8086/write?db=mydb",
          data: `nodemcu,id=${id},type=static slider=${$(this).val()}`
        })
          .done(function( msg ) {
            console.log( "Slider Value Post");
          });
    });
 

    //DASHBOARD INITLIZER WITH PREVIOUS SAVED STATE FROM DB
    Promise.all([ajax1(), ajax2(),ajax3()]).then((data) =>{ // 
        console.log(data);
        if(data[0].results[0].series[0].values[0][1]==1 && $('#green').prop('checked')==false){
            $('#green').click();
        }
        if(data[1].results[0].series[0].values[0][1]==1 && $('#red').prop('checked')==false){
            $('#red').click();
        }

        //Initilize the Slider
        $("#sliderval").html( data[2].results[0].series[0].values[0][1]);
        $('#slider').val(data[2].results[0].series[0].values[0][1]);


      }).catch((err) => {
        alert('Dashboard not inilized with'+err)
      })    

  //REAL TIME DATA STREAMING USING CUSTOM LISTENER FUNCTION
      var data={
        labels: [],
        datasets: [{
            label: 'Distance',
            fill: false,
            borderColor: '#0eb33a', // Add custom color border (Line)
            backgroundColor: '#0eb33a', // Add custom color background (Points and Fill)
            borderWidth: 1 // Specify bar border width
        }]
    }
    var chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
        responsive: true, // Instruct chart js to respond nicely.
        maintainAspectRatio: false, // Add to prevent default behaviour of full-width/height 
    }
    });
    let dp=[];
    let label=[];
    let i=0;
      setInterval(function(){            // CUSTOM LISTENER or SUBSCRIBER
        Promise.all([ajax4(), ajax5()]).then((val) =>{ // 
        // This will be called anytime there is a new ldr or dist valueson V3 or V4
            if(Object.keys(val[0].results[0]).length>1){
                document.getElementById('canvas').setAttribute("data-value",val[0].results[0].series[0].values[0][1]);
                $('#update_gauge').text(new Date(val[0].results[0].series[0].values[0][0]).toLocaleString());
            }
            if(Object.keys(val[1].results[0]).length>1){
                label.push(new Date(val[1].results[0].series[0].values[0][0]).toLocaleString().split(',')[1]);
                dp.push(val[1].results[0].series[0].values[0][1]);
                i = dp.length;
                if(i>5){
                    dp.shift();
                    label.shift();
                    i--;
                }
                data.labels = label;
                data.datasets[0].data=dp;
                //console.log(dp);
                chart.update();  
            }
        });
    },9000);

    function ajax1() {
        return $.ajax({
          url: `http://localhost:8086/query?db=mydb&q=SELECT last(green_led),time FROM nodemcu WHERE id='${id}'`, 
          dataType: 'json',    
          success: function(res) {
            //console.log(res);
            $('#update_green').text(new Date(res.results[0].series[0].values[0][0]).toLocaleString());
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log( 'Could not get data, server response: ' + textStatus + ': ' + errorThrown );
            }
        });
      }
      function ajax2() {
        return $.ajax({
          url: `http://localhost:8086/query?db=mydb&q=SELECT last(red_led),time FROM nodemcu WHERE id='${id}'`, 
          dataType: 'json',    
          success: function(res) {
            $('#update_red').text(new Date(res.results[0].series[0].values[0][0]).toLocaleString());
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log( 'Could not get data, server response: ' + textStatus + ': ' + errorThrown );
            }
        });
      }
      function ajax3() {
        return $.ajax({
          url: `http://localhost:8086/query?db=mydb&q=SELECT last(slider),time FROM nodemcu WHERE id='${id}'`, 
          dataType: 'json',    
          success: function(res) {
            $('#update_slider').text(new Date(res.results[0].series[0].values[0][0]).toLocaleString());
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log( 'Could not get data, server response: ' + textStatus + ': ' + errorThrown );
            }
        });
      }
      function ajax4() {
        return $.ajax({
          url: `http://localhost:8086/query?db=mydb&q=SELECT last(ldr),time FROM nodemcu WHERE id='${id}'`, 
          dataType: 'json',    
          success: function(res) {
            console.log("Got response for ajax4"+ res);
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log( 'Could not get data, server response: ' + textStatus + ': ' + errorThrown );
            }
        });
      }
      function ajax5() {
        return $.ajax({
          url: `http://localhost:8086/query?db=mydb&q=SELECT last(dist),time FROM nodemcu WHERE id='${id}'`, 
          dataType: 'json',    
          success: function(res) {
            console.log("Got response for ajax5"+ res);
          },
          error: function(jqXHR, textStatus, errorThrown) {
            console.log( 'Could not get data, server response: ' + textStatus + ': ' + errorThrown );
            }
        });
      }
 });

         //console.log(user);
        // let arr=[];
        // requestLoop = setInterval(function(){ 
        //     if(arr.length>5){
        //         arr=[];
        //         influx.query(`drop series FROM nodemcu WHERE type='dynamic' and id='${id}'`).then(res => {
        //             console.log("PREVIOUS VALUES DELETED");
        //         }).catch(err => {
        //             console.log(err.stack);
        //         })
        //     }
        //     influx.query(`select last(ldr),last(dist) from nodemcu where id='${id}'`)
        //     .then(result=>{
        //         arr.push(result[0].last);
        //         console.log("Ldr: "+result[0].last+" Dist: "+result[0].last_1);
               
        //     })
        //     .catch(err => {
        //         console.log(err.stack);
        //     });
            
        //      jwt.verify(req.cookies.token, 'test secret', function(err, decoded) {
        //         if(err){
        //             clearInterval(requestLoop);
        //             res.status(401).render('login',{  //401 Unauthorized Accesss
        //                 message: 'Token expired or tampered'
        //             });  
        //         }
        //     });
            
        // },9000);