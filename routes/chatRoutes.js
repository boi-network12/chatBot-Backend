const express = require("express");
const { OpenAI } = require("openai");
const authMiddleware = require("../middleware/authMiddleware");
const Chat = require("../models/chat");
const { check } = require("express-validator");

const router = express.Router();
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Validation middleware
const validateMessage = [
  check("message", "Message is required").not().isEmpty()
];

// ✅ OpenAI Chat (Protected) - Updated to handle multiple chats
router.post("/", authMiddleware, validateMessage, async (req, res) => {
  try {
    const { message, chatId } = req.body;
    const userId = req.user.id;

    // If chatId is provided, find and update existing chat
    // Otherwise create a new one
    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, user: userId });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
    });

    const botReply = completion.choices[0]?.message?.content;

    if (!chat) {
      chat = new Chat({
        user: userId,
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: botReply }
        ],
        title: message.substring(0, 50) // Create a title from first message
      });
    } else {
      chat.messages.push(
        { role: "user", content: message },
        { role: "assistant", content: botReply }
      );
    }

    await chat.save();

    res.json({ 
      success: true,
      reply: botReply,
      chatId: chat._id,
      isNewChat: !chatId
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ 
      success: false,
      error: "Error generating response",
      details: error.message
    });
  }
});

// ✅ Retrieve Chat History
router.get("/", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({ user: req.user.id });
    
    if (!chat) {
      return res.json({ 
        success: true,
        messages: [],
        userId: req.user.id
      });
    }

    res.json({ 
      success: true,
      messages: chat.messages,
      chatId: chat._id
    });
  } catch (error) {
    console.error("Chat History Error:", error);
    res.status(500).json({ 
      success: false,
      error: "Error retrieving chat history",
      details: error.message
    });
  }
});

// ✅ Retrieve All Chats (for history)
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt");
    
    res.json({ 
      success: true,
      chats: chats || []
    });
  } catch (error) {
    console.error("Chat History Error:", error);
    res.status(500).json({ 
      success: false,
      error: "Error retrieving chat history",
      details: error.message
    });
  }
});

// ✅ Retrieve Single Chat
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!chat) {
      return res.status(404).json({ 
        success: false,
        error: "Chat not found"
      });
    }

    res.json({ 
      success: true,
      messages: chat.messages,
      chatId: chat._id
    });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ 
      success: false,
      error: "Error retrieving chat",
      details: error.message
    });
  }
});

// Add this to your backend routes
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Chat.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete Chat Error:", error);
    res.status(500).json({ 
      success: false,
      error: "Error deleting chat"
    });
  }
});

// In your router file (chat.js)

// Add new route for editing messages
router.put("/:chatId/message/:messageIndex", authMiddleware, async (req, res) => {
  try {
    const { chatId, messageIndex } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Find the chat
    const chat = await Chat.findOne({ _id: chatId, user: userId });
    if (!chat) {
      return res.status(404).json({ 
        success: false,
        error: "Chat not found"
      });
    }

    // Check if message exists and is from user
    if (messageIndex >= chat.messages.length || 
        chat.messages[messageIndex].role !== "user") {
      return res.status(400).json({ 
        success: false,
        error: "Invalid message index or message not editable"
      });
    }

    // Update the message content
    chat.messages[messageIndex].content = content;
    chat.messages[messageIndex].timestamp = new Date();
    
    await chat.save();

    res.json({ 
      success: true,
      message: chat.messages[messageIndex],
      chatId: chat._id
    });
  } catch (error) {
    console.error("Edit Message Error:", error);
    res.status(500).json({ 
      success: false,
      error: "Error editing message",
      details: error.message
    });
  }
});

module.exports = router;