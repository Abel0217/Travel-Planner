import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { getAuth } from 'firebase/auth';
import './css/LiveChat.css';

const LiveChat = ({ itineraryId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        const q = query(collection(db, 'itineraries', itineraryId, 'messages'), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, [itineraryId]);

    const sendMessage = async () => {
        if (newMessage.trim() !== "" && currentUser) {
            await addDoc(collection(db, 'itineraries', itineraryId, 'messages'), {
                text: newMessage,
                timestamp: new Date(),
                userId: currentUser.uid,
                userName: currentUser.displayName || "Anonymous",
                userProfilePic: currentUser.photoURL || "",
            });
            setNewMessage("");
        }
    };

    return (
        <div className="live-chat">
            <div className="live-chat-title">
                <h2>Live Chat</h2>
            </div>
            <div className="messages">
                {messages.map(msg => {
                    const isCurrentUser = msg.userId === currentUser.uid;
                    return (
                        <div 
                            key={msg.id} 
                            className={`message ${isCurrentUser ? 'current-user' : 'other-user'}`}
                        >
                            {msg.userProfilePic && !isCurrentUser && (
                                <img src={msg.userProfilePic} alt={`${msg.userName}'s profile`} className="profile-pic" />
                            )}
                            <div className="message-content">
                                <p className="message-text">
                                    {msg.text}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="input-container">
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Type your message here..."
                    style={{ resize: 'none' }}
                />
                <button onClick={sendMessage} className="send-button">➤</button>
            </div>
        </div>
    );
};

export default LiveChat;
