// const { Socket } = require("socket.io");
const Models = require("../models/index");
const saveMessage = require("../controller/socketController");
const moment = require("moment");
const helper = require("../helper/helper");
// console.log("this is date", moment().format("YYYY-MM-DD"));
// console.log("this is time", moment().format("LTS"));
function getRandomElement(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
function removeElementFromArray(array, element) {
  const index = array.indexOf(element);
  if (index !== -1) {
    array.splice(index, 1);
  }
}
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
        throw error
      }
    });
      //this is for create group
    socket.on("create_group", async function (data) {
        try {
          if (!usersIds.includes(adminId)) {
            usersIds.push(adminId);
          }         
           let saveData = {
            admin: data.adminId,
            users: data.usersIds,
            groupName: data.groupName,
            date: moment().format("YYYY-MM-DD"),
            time: moment().format("LTS"),
          };
          let reponse = await Models.groupChatModel.create(saveData);
          let success_msg = {
            success_msg: "Group create successfully",
            reponse: reponse,
          };
          socket.emit("create_group_listener", success_msg);
        } catch (error) {
          console.error(error);
          throw error
        }
      });
    //On click user seen the all message of user one to one after click on user then seen all chat of one user //Test pass
    // Or with groupId find the all messages of groups
    socket.on("users_chat_list", async (get_data) => {
      try {
        if(get_data.groupId){
            const findConstant = await Models.chatconstant.find({
               groupId:get_data.groupId
              });
            if(findConstant){
                   const chatList = await Models.message
                      .find({
                        $and: [
                          {
                            groupId: groupId, 
                          },
                          {
                            groupMessage_clear: { $nin: [get_data.senderId] }
                          },
                        ],
                      })
                      .populate({
                        path: "senderId groupUserIds", // Populate both senderId and groupUserIds
                        select: "profileImage", // Select the fields you want to populate
                      });
      
                    const count = await Models.message.countDocuments({
                      $and: [
                        {
                          $or: [
                               {
                                  groupId: groupId, 
                                },
                               { constantId: findConstant._id },
                          ],
                        },
                        {
                          is_delete: { $ne: get_data.senderId },
                          // is_read: 0,
                          groupMessage_read_by: { $nin: [get_data.senderId] },
                        },
                      ],
                    });
                    const success_messages = {
                      success_message: "Users group Chats",
                      code: 200,
                      unread_message_count: count,
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

            }else {
              const success_message = {
                error: "Users Chat not found",
                code: 403,
              };
              socket.emit("users_chat_list_listener", success_message);
            }
        }else{
            const findConstant = await Models.chatconstant.find({
                $or: [
                  { senderId: get_data.senderId, reciverId: get_data.reciverId },
                  { reciverId: get_data.senderId, senderId: get_data.reciverId },
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
        }
      } catch (error) {
        console.log(error);
        throw error
      }
    });
    //List of all user with whom sender-User do chat also count the unread message for each user  //Test pass
    //also with groups
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
            { groupUserIds: senderId },
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
                groupMessage_read_by: { $nin: [userId] },
              },
            ],
          });
          unreadMessageCounts[userId] = count;
        }
        // Add unread message counts to the constantList
        constantList.forEach((constant) => {
          const senderId = constant.senderId
            ? constant.senderId._id.toString()
            : "";
          const reciverId = constant.reciverId
            ? constant.reciverId._id.toString()
            : "";
          const userId = senderId === get_data.senderId ? reciverId : senderId;
          if (userId) {
            constant.unreadCount = unreadMessageCounts[userId] || "0";
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
        throw error
      }
    });
    //Message send //Test pass
    socket.on("send_message", async function (data) {
      try {
        if (data.groupId) {
          let checkChatConstant = await Models.chatconstant.findOne({
            groupId: data.groupId,
          });
          if (checkChatConstant) {
            await Models.chatconstant.updateOne(
              { _id: checkChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LTS"),
              }
            );
          } else {
            let createChatConstant = await Models.chatconstant.create({
              senderId: data.senderId,
              groupUserIds: data.groupUserIds,
              groupId: data.groupId,
            });
            await Models.chatconstant.updateOne(
              { _id: createChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LTS"),
              }
            );
          }
          let saveMsg = await Models.message.create({
            senderId: data.senderId,
            groupUserIds: data.groupUserIds,
            message: data.message,
            message_type: data.message_type,
            constantId: checkChatConstant.id,
            groupId: data.groupId,
            date: moment().format("YYYY-MM-DD"),
            time: moment().format("LTS"),
          });

          const getMsg = await Message.findOne({
            senderId: saveMsg.senderId,
            groupUserIds: { $in: groupUserIds }, // Use $in to match any of the values in the array
            _id: saveMsg._id,
          })
            .populate({
              path: "groupUserIds",
              select: "id name profileImage", // Select the fields you want to populate
            })
            .populate({
              path: "senderId",
              select: "id name profileImage", // Select the fields you want to populate
            });
          if (getMsg) {
            getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
            const get_socket_id = await Models.socketuser.findOne({
              userId: data.reciverId,
            });
            let user = await Models.userModel.findOne({
              _id: data.reciverId,
            });
            console.log("Inside if", user);
            if (user && user.deviceToken) {
              let deviceToken = user.deviceToken;
              let deviceType = user.deviceType;
              let sendData = {
                ...data,
                deviceToken,
                deviceType,
              };
              await helper.sendPushToIos(sendData);
            }
            if (getMsg) {
              getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
              // Iterate through the groupUserIds
              for (const userId of groupUserIds) {
                const get_socket_id = await Models.socketuser.findOne({
                  userId: userId,
                });

                if (get_socket_id) {
                  io.to(get_socket_id.socketId).emit(
                    "send_message_emit",
                    getMsg
                  );
                }

                // Find the user to get deviceToken and deviceType
                const user = await Models.userModel.findOne({
                  _id: userId,
                });

                if (user && user.deviceToken) {
                  const deviceToken = user.deviceToken;
                  const deviceType = user.deviceType;

                  // Prepare data for sending push notification
                  const sendData = {
                    ...data,
                    deviceToken,
                    deviceType,
                  };

                  await helper.sendPushToIos(sendData);
                }
              }
              // Emit to the current socket (assuming this is the sender's socket)
              socket.emit("send_message_emit", getMsg);
            }
            socket.emit("send_message_emit", getMsg);
          }
        } else {
          let checkChatConstant = await Models.chatconstant.findOne({
            $or: [
              { senderId: data.senderId, reciverId: data.reciverId },
              { senderId: data.reciverId, reciverId: data.senderId },
            ],
          });
          if (checkChatConstant) {
            await Models.chatconstant.updateOne(
              { _id: checkChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LTS"),
              }
            );
          } else {
            let createChatConstant = await Models.chatconstant.create({
              senderId: data.senderId,
              reciverId: data.reciverId,
            });
            await Models.chatconstant.updateOne(
              { _id: createChatConstant._id },
              {
                lastmessage: saveMsg._id,
                date: moment().format("YYYY-MM-DD"),
                time: moment().format("LTS"),
              }
            );
          }
          let saveMsg = await Models.message.create({
            senderId: data.senderId,
            reciverId: data.reciverId,
            message: data.message,
            message_type: data.message_type,
            constantId: createChatConstant._id,
            date: moment().format("YYYY-MM-DD"),
            time: moment().format("LTS"),
          });

          let getMsg = await Models.message
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
          if (getMsg) {
            getMsg = getMsg.length > 0 ? getMsg[0] : getMsg;
            const get_socket_id = await Models.socketuser.findOne({
              userId: data.reciverId,
            });
            if (get_socket_id) {
              io.to(get_socket_id.socketId).emit("send_message_emit", getMsg);
            }
            let user = await Models.userModel.findOne({
              _id: data.receiverId,
            });
            console.log("Inside else", user);
            if (user && user.deviceToken) {
              let deviceToken = user.deviceToken;
              let deviceType = user.deviceType;
              let sendData = {
                ...data,
                deviceToken,
                deviceType,
              };
              await helper.sendPushToIos(sendData);
            }
            socket.emit("send_message_emit", getMsg);
          }
        }
      } catch (error) {
        console.error(error);
        throw error
      }
    });
    //Rename group name
    socket.on("rename_group_name", async function (data) {
      try {
        let criteria={
          groupName:data.groupName
        }
        let exits=await Models.groupChatModel.findOne(criteria);
        if(!exits){
          const success_message = {
            error: "No group found",
            code: 403,
          };
          socket.emit("rename_group_name_listener", success_message);
        }
        let objToSave = {
          groupName: data.groupName,
        };
        let reponse = await Models.groupChatModel.updateOne(criteria,objToSave);
        let success_msg = {
          success_msg: "Group name change successfully",
          reponse: reponse,
        };
        socket.emit("rename_group_name_listener", success_msg);
      } catch (error) {
        console.error(error);
        throw error
      }
    });
    //Remove from group
    socket.on("remove_from_group"),async function (data){
      try {
        let criteria={
          groupId:data.groupId
        }
        let groupChat = await Models.groupChatModel.findOne(criteria);

        if (!groupChat) {
          throw new Error("Group not found");
        }
        let exits=await Models.groupChatModel.findOne(criteria);
        if(exits.admin.toString()==data.removerId.toString()){
          let objToUpdate={
            admin:getRandomElement(exits.users),
            users:removeElementFromArray(exits.users,data.removerId)
          }
          let response=await Models.groupChatModel.findByIdAndUpdate({ _id : exits._id },{$set:{...objToUpdate}});
          let success_msg = {
            success_msg: "Remove form group successfully",
            reponse: response,
          };
          socket.emit("remove_from_group_listener", success_msg);
        }else{
          let objToUpdate={
            users:removeElementFromArray(exits.users,data.removerId)
          }
          let response=await Models.groupChatModel.findByIdAndUpdate({ _id : exits._id },{$set:{...objToUpdate}});
          let success_msg = {
            success_msg: "Remove form group successfully",
            reponse: response,
          };
          socket.emit("remove_from_group_listener", success_msg);
        }
      } catch (error) {
        throw error
      }
    }
    //read message
    socket.on("read_unread", async function (data) {
      try {
        if(data.groupId){
        let criteria={
          _id:data.messageId
        }
        let exits=await Models.groupChatModel.find(criteria)
        if(exits){
          let update=await Models.message.updateOne(
            { _id: data.messageId },
            {
              $addToSet: {
                groupMessage_read_by: data.userId,
              },
            });
            const data = { is_read: 1 };
            socket.emit("read_data_status", data);
        }else{
          let data="Not group exist"
          socket.emit("read_data_status", data);
        }
        }else{
          const updateResult = await Models.message.updateMany(
            {
              _id:data.messageId,
              is_read: 0,
            },
            {
              $set: { is_read: 1 },
            }
          );
          console.log(updateResult, "get_read_unread");
          const data = { is_read: 1 };
          socket.emit("read_data_status", data);
        }
      } catch (error) {
        console.log(error);
      }
    });
    //clear chat need senderId receiverId and group id if delete form group
    socket.on("clear_chat", async (get_data) => {
      try {
        if(get_data.groupId){
          //To update many records, adding the senderId to the groupMessage_clear array if the key doesn't exist, or checking if the senderId is not already in the array,
          await Models.message.updateMany(
            {
              $or: [
                { groupId: get_data.groupId },
              ],
              $or: [
                { groupMessage_clear: { $exists: false } }, // If the key doesn't exist
                { groupMessage_clear: { $nin: [get_data.senderId] } }, // If the senderId is not in the array
              ],
            },
            { $addToSet: { groupMessage_clear: get_data.senderId } }
          );
          
           // Send success response to the client
        const success_message = {
          success_message: "Message clear successfully",
        };
        socket.emit("clear_chat_listener", success_message);
        }else{
        // Find the message to be clear
        const getMessage = await Models.message.find({
          $or: [
            { senderId: get_data.senderId },
            { reciverId: get_data.senderId },
          ],
          is_delete: { $exists: false },
        });
        if (getMessage) {
          // Update the message's deletedId if it exists
          await Models.message.updateMany(
            {
              $or: [
                { senderId: get_data.senderId },
                { reciverId: get_data.senderId },
              ],
              is_delete: { $exists: false },
            },
            { is_delete: get_data.senderId }
          );
        } else {
          // Delete the message if it doesn't exist or already marked as deleted
          await Models.message.deleteMany({
            $or: [
              { senderId: get_data.senderId },
              { reciverId: get_data.senderId },
            ],
            is_delete: { $ne: get_data.senderId },
          });
        }
        // Send success response to the client
        const success_message = {
          success_message: "Message clear successfully",
        };
        socket.emit("clear_chat_listener", success_message);
        }
      } catch (error) {
        console.log(error);
      }
    });
    //Lister for typing 
    socket.on('typing', (data) => {
      const { senderId, receiverId } = data;
      // Broadcast typing event to the receiver
      if(data.groupId){
        socket.to(data.groupId).emit('typing', senderId);
      }else{
        socket.to(receiverId).emit('typing', senderId);
      }
    });
    // Listen for stopTyping event
    socket.on('stopTyping', (data) => {
     const { senderId, receiverId } = data;
     // Broadcast stopTyping event to the receiver
     if(data.groupId){
       socket.to(data.groupId).emit('stopTyping', senderId);
      }else{
       socket.to(receiverId).emit('stopTyping', senderId);
     }
    });
    //Delete the message senderId and _id i.e msg id
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
  });
};
