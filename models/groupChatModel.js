const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupChatSchema = new Schema({
  admin: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "user"
  },
  users:[ {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "user"
  }],
  groupName: {
    type: String,
  },
  date:{
    type:String,
  },
  time:{
    type:String
  },
},{ timestamps: true });

const groupChat = mongoose.model('groupChat', groupChatSchema);

module.exports = groupChat;
