// const { Socket } = require("socket.io");
const Models = require("../models/index");
const saveMessage = require("../controller/socketController");
const moment = require("moment");
const helper=require("../helper/helper")
//chatContants module has last message detail message model has message 
// console.log("this is date", moment().format("YYYY-MM-DD"));
// console.log("this is time", moment().format("LTS"));
module.exports = function (io) {
  io.on("connection", (socket) => {
    // http://192.168.1.210:8747/ when from forntend side start on it give this url instead of localhost give ipV4
    console.log("connected user", socket.id);
    //Connect the user  //Test pass
    socket.on("connect_user", async function (data) {
      try {
        const socketId = socket.id;
        const checkUser = await Models.socketuser.findOne({
          userId: data.userId,
        });

        if (checkUser) {
          await Models.socketuser.updateOne(
            { userId: data.userId },
            { $set: { status: 1, socketId: socketId } }
          );
        } else {
          await Models.socketuser.create({
            userId: data.userId,
            socketId: socketId,
            status: 1,
          });
        }

        let success_msg = {
          success_msg: "connected successfully",
        };
        socket.emit("connect_user_listener", success_msg);
      } catch (error) {
        console.error(error);
      }
    });
    //On click user seen the all message of user one to one after click on user then seen all chat of one user //Test pass
    socket.on("users_chat_list", async (get_data) => {
      try {
        console.log("this is getdata", get_data);
        const findConstant = await Models.chatconstant.find({
            $or: [
              { senderId: get_data.senderId, reciverId: get_data.reciverId },
              { reciverId: get_data.senderId, senderId: get_data.reciverId },
              {
                $and: [
                  { senderId: { $in: get_data.groupArray || [] } },
                  { reciverId: { $in: get_data.groupArray || [] } },
                ],
              },
            ],
          });
          

        if (findConstant) {
          const chatList = await Models.message.find({
            $and: [
              {
                $or: [
                  {
                    senderId: get_data.senderId,
                    reciverId: get_data.reciverId,
                  },
                  {
                    reciverId: get_data.senderId,
                    senderId: get_data.reciverId,
                  },
                  { senderId: { $in: get_data.groupArray || [] } },
                  { reciverId: { $in: get_data.groupArray || [] } },
                  { constantId: findConstant._id },
                ],
              },
              {
                is_delete: { $ne: get_data.senderId },
              },
            ],
          }).populate('senderId', 'profileImage') // Populate sender's profile image
          .populate('reciverId', 'profileImage'); // Populate receiver's profile image;
          const count = await Models.message.countDocuments({
            $and: [
              {
                $or: [
                  {
                    senderId: get_data.senderId,
                    reciverId: get_data.reciverId,
                  },
                  {
                    reciverId: get_data.senderId,
                    senderId: get_data.reciverId,
                  },
                  { senderId: { $in: get_data.groupArray || [] } },
                  { reciverId: { $in: get_data.groupArray || [] } },
                  { constantId: findConstant._id },
                ],
              },
              {
                is_delete: { $ne: get_data.senderId },
                is_read: 0,
              },
            ],
          });
          const success_messages = {
            success_message: "Users Chats",
            code: 200,
            unread_message_count:count,
            // getdatas: chatList,
            getdata: chatList.map((message) => {
              const isMessageFromSender =
                // message.senderId.toString() === get_data.senderId.toString();
                message.senderId === get_data.senderId;
              return {
                ...message.toObject(),
                messageSide: isMessageFromSender ? "sender" : "other",
              };
            }),
          };
          socket.emit("users_chat_list_listener", success_messages);
        } else {
          const success_message = {
            error: "Users Chat not found",
            code: 403,
          };
          socket.emit("users_chat_list_listener", success_message);
        }
      } catch (error) {
        console.log(error);
      }
    });
    //List of all user with whom sender-User do chat  //Test pass
    socket.on("user_constant_list", async (get_data) => {
      try {
        const { filter, senderId } = get_data;
        let order;
        if (filter === 1) {
          order = { createdAt: 1 }; // Sort by old to new
        } else if (filter === 2) {
          order = { createdAt: -1 }; // Sort by new to old
        }
      
        // Build the query to find chat constants
        const where = {
          $or: [
            { senderId: senderId, is_block: { $ne: 1 } },
            { reciverId: senderId, is_block: { $ne: 1 } },
            { senderId: senderId, is_block: { $exists: false } },
            { reciverId: senderId, is_block: { $exists: false } },
            { senderId: { $in: get_data.groupArray || [] } },
            { reciverId: { $in: get_data.groupArray || [] } },
          ],
        };
      
        if (filter == 3) {
          where.is_favourite = 1;
        }
      
        // Find all chat constants that match the criteria
        const constantList = await Models.chatconstant
          .find(where)
          .populate({
            path: "lastmessage",
            select: "senderId reciverId message message_type is_read",
            model: Models.message,
          })
          .populate({
            path: "senderId reciverId",
            select: "id name profileImage email",
            model: Models.userModel,
          })
          .sort(order);
          
        // Create an array to store user IDs for whom we want to count unread messages
        const userIds = constantList.map((constant) => {
          if (constant.senderId._id.toString() === senderId) {
            return constant.reciverId != null
              ? constant.reciverId._id.toString()
              : constant.reciverId;
          } else {
            return constant.senderId != null
              ? constant.senderId._id.toString()
              : constant.senderId;
          }
        });
        // Initialize an empty object to store unread message counts
        const unreadMessageCounts = {};
        // Loop through each user ID and count unread messages
        for (const userId of userIds) {
          const count = await Models.message.countDocuments({
            $and: [
              {
                $or: [
                  {
                    senderId: userId,
                  },
                ],
              },
              {
                reciverId: senderId, // Assuming senderId is the receiver
                is_read: 0,
              },
            ],
          });
          unreadMessageCounts[userId] = count;
        }
        // Add unread message counts to the constantList
        constantList.forEach((constant) => {
          const senderId = constant.senderId?constant.senderId._id.toString():'';
          const reciverId = constant.reciverId?constant.reciverId._id.toString():'';
          const userId = senderId === get_data.senderId ? reciverId : senderId;
          if (userId) {
            console.log("unreadMessageCounts[userId]",unreadMessageCounts[userId])
            constant.unreadCount = unreadMessageCounts[userId] || '0';
          } else {
            constant.unreadCount = 0; // Handle the case where both senderId and receiverId are null
          }
        });
        const success_message = {
          success_message: "User Constant Chats List with Unread Message Count",
          code: 200,
          getdata: constantList,
        };
      
        socket.emit("user_constant_chat_list", success_message);
      } catch (error) {
        console.log(error);
      }
      
    });
    //Disconnect the user //Test pass
    socket.on("disconnect_user", async (connect_listener) => {
      try {
        const socket_id = socket.id;
        const check_user = await Models.socketuser.findOne({
          userId: connect_listener.userId,
        });

        if (check_user) {
          await Models.socketuser.updateOne(
            { userId: connect_listener.userId },
            { $set: { status: 0 } }
          );
        }
        const success_message = {
          success_message: "Disconnect successfully",
          socket_id,
        };
        socket.emit("disconnect_listener", success_message);
      } catch (error) {
        console.error(error);
      }
    });
    //Message read and unread //Test pass
    socket.on("read_unread", async function (get_read_status) {
      try {
        const updateResult = await Models.message.updateMany(
          {
            _id:get_read_status._id,
            is_read: 0,
          },
          {
            $set: { is_read: 1 },
          }
        );
        console.log(updateResult, "get_read_unread");
        const get_read_unread = { is_read: 1 };
        socket.emit("read_data_status", get_read_unread);
      } catch (error) {
        console.log(error);
      }
    });
    //Delete the message //test pass 
    socket.on("delete_message", async (get_data) => {
      try {
        let deleteMessage;
        if (Array.isArray(get_data.id)) {
          // It's an array of IDs
          deleteMessage = await Models.message.deleteMany({
            $or: [
              { senderId: get_data.senderId, _id: { $in: get_data.id } },
              { reciverId: get_data.senderId, _id: { $in: get_data.id } },
            ],
          });
             //Find last message
             let lastMessage = await Models.chatconstant.findOne({
              $or: [
                { senderId: get_data.senderId, lastmessage: { $in: get_data.id }},
                { reciverId: get_data.senderId, lastmessage:{ $in: get_data.id }},
              ],
            });
            if (lastMessage) {
              //Then find last message
              let data = await Models.message.findOne(
                {},
                {},
                { sort: { time: -1 } }
              );
              //Then store last message in chatConstant
              await Models.chatconstant.updateOne(
                { _id: lastMessage._id },
                { lastmessage: data._id, date: data.date, time: data.time }
              );
            }
        } else {
          // It's a single ID
          deleteMessage = await Models.message.deleteOne({
            $or: [
              { senderId: get_data.senderId, _id: get_data.id },
              { reciverId: get_data.senderId, _id: get_data.id },
            ],
          });
          //Find last message
          let lastMessage = await Models.chatconstant.findOne({
            $or: [
              { senderId: get_data.senderId, lastmessage: get_data.id },
              { reciverId: get_data.senderId, lastmessage: get_data.id },
            ],
          });
          if (lastMessage) {
            //Then find last message
            let data = await Models.message.findOne(
              {},
              {},
              { sort: { time: -1 } }
            );
            //Then store last message in chatConstant
            await Models.chatconstant.updateOne(
              { _id: lastMessage._id },
              { lastmessage: data._id, date: data.date, time: data.time }
            );
          }
        }
        // Send success response to the client
        const success_message = {
          success_message: "Message deleted successfully",
        };
        socket.emit("delete_message_listener", success_message);
      } catch (error) {
        console.log(error);
      }
    });
    //Message send //Test pass
    socket.on("send_message", async function (data) {
        console.log("this is data",data);
      try {
        let query = {
            $or: [
              { senderId: data.senderId, reciverId: data.reciverId },
              { senderId: data.reciverId, reciverId: data.senderId },
              { senderId: { $in: data.groupArray || [] } },
              { reciverId: { $in: data.groupArray || [] } },
            ],
          };
          let checkChatConstant = await Models.chatconstant.findOne(query);
          console.log("checkChatConstant",checkChatConstant)
        if (checkChatConstant) {
            let messageData = {
                senderId: data.senderId,
                message: data.message,
                message_type: data.message_type,
                constantId: checkChatConstant.id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LTS"),
              };
              
              if (data.reciverId) {
                messageData.reciverId = data.reciverId;
                messageData.isGroup=false
              }
              if(data.groupArray){
                messageData.groupArray=data.groupArray,
                messageData.isGroup=true,
                messageData.groupName=data.groupName
              }
              let saveMsg = await Models.message.create(messageData);
              
          await Models.chatconstant.updateOne(
            { _id: checkChatConstant._id },
            {
              lastmessage: saveMsg._id,
              date: moment().format("YYYY-MM-DD"),
              time: moment().format("LTS"),
            }
          );
          

          let query = {
            senderId: saveMsg.senderId,
            _id: saveMsg._id,
          };
          
          if (data.reciverId) {
            query.reciverId = saveMsg.reciverId;
          }
          
          if (data.groupArray && Array.isArray(data.groupArray) && data.groupArray.length > 0) {
            query.groupId = { $in: data.groupArray };
          }
          
          let getMsg = await Models.message
            .findOne(query)
            .populate([
              {
                path: "senderId",
                select: "id name profileImage",
              },
            ]);
          
          if (data.reciverId) {
            getMsg = getMsg.populate({
              path: "reciverId",
              select: "id name profileImage",
            });
          }
          
          // If groupArray exists, add groupId to the population query
          if (data.groupArray && Array.isArray(data.groupArray) && data.groupArray.length > 0) {
            getMsg = getMsg.populate({
              path: "groupId",
              select: "id name",
            });
          }
          
            // console.log("getMsg",getMsg)
            if (getMsg) {
                getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
                let receiverIds = [];
              
                if (data.reciverId) {
                  // Handle the case with reciverId
                  receiverIds.push(data.reciverId);
                }
              
                if (data.groupArray && Array.isArray(data.groupArray) && data.groupArray.length > 0) {
                  // Handle the case with groupArray
                  receiverIds = receiverIds.concat(data.groupArray);
                }
              
                // Find socket IDs for all receiver IDs
                const socketUsers = await Models.socketuser.find({ userId: { $in: receiverIds } });
              
                // Send push notifications and emit messages to the socket IDs
                for (const socketUser of socketUsers) {
                  const user = await Models.userModel.findOne({ _id: socketUser.userId });
                  if (user && user.deviceToken) {
                    const deviceToken = user.deviceToken;
                    const deviceType = user.deviceType;
                    const sendData = {
                      ...data,
                      deviceToken,
                      deviceType,
                    };
                    await helper.sendPushToIos(sendData);
                  }
                  
                  io.to(socketUser.socketId).emit('send_message_emit', getMsg);
                }
              
                // Emit to the sender's socket
                socket.emit('send_message_emit', getMsg);
              }
              
        } else {
          var getMsg;
          console.log("inside else")
            if (data.reciverId) {
                // Handle the case with reciverId
                const createChatConstant = await Models.chatconstant.create({
                  senderId: data.senderId,
                  reciverId: data.reciverId,
                });
              
                const saveMsg = await Models.message.create({
                  senderId: data.senderId,
                  reciverId: data.reciverId,
                  message: data.message,
                  message_type: data.message_type,
                  constantId: createChatConstant._id,
                  date: moment().format("YYYY-MM-DD"),
                  time: moment().format("LTS"),
                  isGroup:false,   
                });
              
                await Models.chatconstant.updateOne(
                  { _id: createChatConstant._id },
                  {
                    lastmessage: saveMsg._id,
                    date: moment().format("YYYY-MM-DD"),
                    time: moment().format("LTS"),
                  }
                );
              
                 getMsg = await Models.message
                  .findOne({
                    senderId: data.senderId,
                    reciverId: data.reciverId,
                    _id: saveMsg._id,
                  })
                  .populate([
                    {
                      path: "senderId",
                      select: "id name profileImage",
                    },
                    {
                      path: "reciverId",
                      select: "id name profileImage",
                    },
                  ]);
              } else if (data.groupArray && Array.isArray(data.groupArray) && data.groupArray.length > 0) {
                // Handle the case with groupArray
                console.log("Inside else and else if")

                const createChatConstant = await Models.chatconstant.create({
                    senderId: data.senderId,
                    groupArray: groupArray,
                  });
              
                  const saveMsg = await Models.message.create({
                    senderId: data.senderId,
                    groupArray: groupArray,
                    message: data.message,
                    message_type: data.message_type,
                    constantId: createChatConstant._id,
                    date: moment().format("YYYY-MM-DD"),
                    time: moment().format("LTS"),
                    isGroup:true,
                    groupName:data.groupName
                  });
              
                  await Models.chatconstant.updateOne(
                    { _id: createChatConstant._id },
                    {
                      lastmessage: saveMsg._id,
                      date: moment().format("YYYY-MM-DD"),
                      time: moment().format("LTS"),
                    }
                  );
              
                   getMsg = await Models.message
                    .findOne({
                      senderId: data.senderId,
                      groupArray: groupArray,
                      _id: saveMsg._id,
                    })
                    .populate([
                      {
                        path: "senderId",
                        select: "id name profileImage",
                      },
                      {
                        path: "reciverId",
                        select: "id name profileImage",
                      },
                    ]);
    
              }              
            if (getMsg) {
                getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
                let receiverIds = [];
              
                if (data.reciverId) {
                  // Handle the case with reciverId
                  receiverIds.push(data.reciverId);
                }
              
                if (data.groupArray && Array.isArray(data.groupArray) && data.groupArray.length > 0) {
                  // Handle the case with groupArray
                  receiverIds = receiverIds.concat(data.groupArray);
                }
              
                // Find socket IDs for all receiver IDs
                const socketUsers = await Models.socketuser.find({ userId: { $in: receiverIds } });
              
                // Send push notifications and emit messages to the socket IDs
                for (const socketUser of socketUsers) {
                  const user = await Models.userModel.findOne({ _id: socketUser.userId });
                  if (user && user.deviceToken) {
                    const deviceToken = user.deviceToken;
                    const deviceType = user.deviceType;
                    const sendData = {
                      ...data,
                      deviceToken,
                      deviceType,
                    };
                    await helper.sendPushToIos(sendData);
                  }
                  
                  io.to(socketUser.socketId).emit('send_message_emit', getMsg);
                }
              
                // Emit to the sender's socket
                socket.emit('send_message_emit', getMsg);
              }
              
        }
      } catch (error) {
        console.error(error);
      }
    });
  });
};
