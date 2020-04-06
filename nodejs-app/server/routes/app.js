const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var request = require('request-promise');
const influx = require('../db/db');
var uniqid = require('uniqid');
var mqtt = require('mqtt');


router.get('/', (req, res) => {
    res.redirect('/login');
});

router.get('/register', (req, res) => {
    res.render('register',{
        message: ''
    }); 
});
router.get('/login', (req, res) => {
    res.render('login',{
        message: ''
    }); 
});
router.post('/login', (req, res) => {
    influx.query(`select * from userdata where email='${req.body.email}'`)
    .then(user=> {
        //console.log(user);
        bcrypt.compare(req.body.password,user[0].password, (err,result)=>{
            if(err){
                console.log(err);
            }
            if(result){   //If comparasion is successful
            const token = jwt.sign({
                    email: user[0].email,
                    userId: user[0].id
                },'test secret',{expiresIn:'3h'});
                // Set session expiration to 3 hr.
            const expiresIn = 60 * 60* 3 * 1000;
            const options = {maxAge: expiresIn, httpOnly: true};
            res.cookie('token', token, options);
            res.cookie('id', user[0].id, options);

                res.redirect('/dashboard/'+user[0].id); 
            }
            else{
                res.render('login',{
                    message: 'password do not match'
                }); 
            }
        })
    })
    .catch(err=>{
        res.render('login',{
            message: err.stack
        }); 
    })
});

router.post('/register', (req, res) => {
    influx.query(`select * from userdata where email='${req.body.email}'`)
    .then(user=> {
        //console.log(user);
        if(user.length >=1){
            return res.render('register',{
                message: 'User Already Exists'
            });
        }
        else{
            let password= req.body.password;
            let confirm_password= req.body.confirm_password;
            if(password===confirm_password){
                bcrypt.hash(req.body.password,10, (err,hash)=>{   //Salt size is 10
                    if(err){
                        return res.render('register',{
                            message: err
                        }); 
                    }else{
                        influx.writePoints([
                            {
                              measurement: 'userdata',
                              tags: { 
                                id: uniqid(),
                                email: req.body.email,
                             },
                              fields: { 
                                password: hash
                               },
                            }
                          ]).then(() => {
                              console.log('User added in DB');
                              res.render('login',{
                                message: 'Login with same credentials'
                            });
                        })
                        .catch(err =>{
                            res.render('register',{
                                message: err.stack
                            }); 
                        })
                    }
                });
            }
        }
    })
    .catch(err=>{
        res.render('register',{
            message: err.stack
        }); 
    })
});
//var requestLoop;
var client  = mqtt.connect('ws://iot_guy:mosquitto@127.0.0.1:9001');
client.on('connect', function () {
    console.log("Server connected to the Mqtt for nodemcu"); 
});
var client1  = mqtt.connect('mqtt://127.0.0.1:1883');
client1.on('connect', function () {
    console.log("Server connected to the websocket Mqtt for browser"); 
});
router.get('/dashboard/:id', isLoggedIn, (req, res) => {   //Protecting this route with IsLoggedIn Middleware
    const id= req.params.id;
    //console.log(req.sessions.token);
    influx.query(`select * from userdata where id='${id}'`)
    .then(user=>{
            client1.subscribe(id+'/nodemcu', function (err) {
                if (err) {
                    console.log(err);
                }else{
                    console.log('Subscribed to '+id+'/nodemcu');
                }
            });
            client1.subscribe(id+'/red_led');
            client1.subscribe(id+'/green_led');
            client1.subscribe(id+'/servo');

            client.subscribe(id+'/red_led');
            client.subscribe(id+'/green_led');
            client.subscribe(id+'/servo');
        
        function IsJSONString(text){
            if (typeof text!=="string"){
                return false;
            }
            try{
                JSON.parse(text);
                return true;
            }
            catch (error){
                return false;
            }
          }

        client.on('message', function(topic, msg) {   //FOr communicating to CLIENT/BROWSER
            if(topic==id+'/green_led'){
                if(msg.toString()=='ON')
                    client1.publish(id+'/green_led', 'ON',{qos:2});    
                else
                    client1.publish(id+'/green_led', 'OFF');
            }
            if(topic==id+'/red_led'){
                if(msg.toString()=='ON')
                    client1.publish(id+'/red_led', 'ON');    
                else
                    client1.publish(id+'/red_led', 'OFF');
            }
            if(topic==id+'/servo'){
                client1.publish(id+'/servo',msg.toString());
            }
          });
        client1.on('message', function(topic, msg) {   //FOr communicating to NODEMCU
            if(topic==`${id}/nodemcu`){
                let obj;
                if(IsJSONString(msg.toString())==true){
                    obj = JSON.parse(msg.toString());
                }
                //console.log(obj);
                influx.writePoints([
                    {
                      measurement: 'nodemcu',
                      tags: { 
                        id: id,
                        type:'dynamic'
                     },
                      fields: { 
                        ldr: obj.ldr,
                        dist: obj.dist
                       },
                    }
                  ]).then(() => {
                      console.log('LDR: '+obj.ldr+' Dist: '+obj.dist);  
                      client.publish(id+'/nodemcu',msg.toString(),{qos:2});  
                      influx.query(`
                            select last(ldr),time from nodemcu
                            WHERE id='${id}'`).then(result => {
                                client.publish(id+'/nodemcu_time',new Date(result[0].time).toLocaleString(),{qos:2});  
                        }).catch(err => {
                            console.log(err.stack);
                        });        
                    })
            }
            if(topic==id+'/green_led'){
                influx.writePoints([
                    {
                      measurement: 'nodemcu',
                      tags: { 
                        id: id,
                        type:'static'
                     },
                      fields: { 
                        green_led: msg.toString()
                       },
                    }
                  ]).then(() => {
                      console.log('GREEN: '+msg.toString());  
                      influx.query(`
                            select last(green_led),time from nodemcu
                            WHERE id='${id}'`).then(result => {
                                client.publish(id+'/green_time',new Date(result[0].time).toLocaleString(),{qos:2});  
                        }).catch(err => {
                            console.log(err.stack);
                        });
                        //client.publish('green_time',new Date().toLocaleString());   can be used with other DB
                    })
            }
            else if(topic==id+'/red_led'){
                influx.writePoints([
                    {
                      measurement: 'nodemcu',
                      tags: { 
                        id: id,
                        type:'static'
                     },
                      fields: { 
                        red_led: msg.toString()
                       },
                    }
                  ]).then(() => {
                      console.log('RED: '+msg.toString());  
                      influx.query(`
                            select last(red_led),time from nodemcu
                            WHERE id='${id}'`).then(result => {
                                client.publish(id+'/red_time',new Date(result[0].time).toLocaleString(),{qos:2});  
                        }).catch(err => {
                            console.log(err.stack);
                        });        
                    })
            }
            if(topic==id+'/servo'){
                influx.writePoints([
                    {
                      measurement: 'nodemcu',
                      tags: { 
                        id: id,
                        type:'static'
                     },
                      fields: { 
                        servo: msg.toString()
                       },
                    }
                  ]).then(() => {
                      console.log('servo: '+msg.toString()); 
                      influx.query(`
                            select last(servo),time from nodemcu
                            WHERE id='${id}'`).then(result => {
                                client.publish(id+'/servo_time',new Date(result[0].time).toLocaleString(),{qos:2});  
                        }).catch(err => {
                            console.log(err.stack);
                        });         
                    })
            }
            
        });

        res.render('dashboard',{
            uid: user[0].id,
            creationTime: user[0].time,
            email: user[0].email
        }); 

    })
    .catch(function(err) {
        console.log(err.stack);
    });
});

router.get('/logout', function(req, res) {
    //clearInterval(requestLoop);
    let id= req.cookies.id;
    client.unsubscribe([id+'/nodemcu',id+'/red_led',id+'/green_led',id+'/servo'],function(err){     // id/#
        if(err){
            console.log("Mqtt err: "+err);
        }else{
        console.log("UNSUBSCRIBED EVERY TOPIC of browser");
        client.publish(id+'/turnoff_client','ok');
        }
    });
        client1.unsubscribe([id+'/nodemcu',id+'/red_led',id+'/green_led',id+'/servo'],function(err){     // id/#
            if(err){
                console.log("Mqtt err: "+err);
            }else{
            console.log("UNSUBSCRIBED EVERY TOPIC of nodemcu");
            res.clearCookie('token');
            res.redirect('/login');
            }
        });
});

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {   //To verify an incoming token from client
    try{
        //console.log(req.cookies.token);
        jwt.verify(req.cookies.token, 'test secret');  
        return next();
    }
    catch(err){
        console.log(err.message);
        return res.status(401).render('login',{  //401 Unauthorized Accesss
            message: 'Token expired or tampered'
        });  
    }
}


module.exports = router;