const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventNotificationModel = new Schema({
    senderId: {  //this is sender 
    type: Schema.Types.ObjectId,
    ref: 'user', // Reference to the User schema
    required: true,
  },
  reciverId: {   //this is receiver hoga
    type: Schema.Types.ObjectId,
    ref: 'user', // Reference to the User schema
    required: true,
  },
  message:{
    type:String
  },
  notificationTo:{
    type:String,
    enum:["coHost","guests","none"],
    default:"none"
  },
  is_read:{
    type:Number,
    enum:[0,1],//0 for not read 1 for read
    default:0
  }
},{ timestamps: true });

const eventNotification = mongoose.model('eventNotificationModel', eventNotificationModel);

module.exports = eventNotification;
