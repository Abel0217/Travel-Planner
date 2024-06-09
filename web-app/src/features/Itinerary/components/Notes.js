import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; // Adjust the path as necessary
import './css/Notes.css'; // Make sure to create and import your CSS file

// Custom Toolbar Component
const CustomToolbar = () => (
    <div id="toolbar" className="quill-toolbar">
        <select className="ql-font">
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="sans-serif">Sans Serif</option>
            <option value="times-new-roman">Times New Roman</option>
            <option value="verdana">Verdana</option>
            <option value="arial">Arial</option>
        </select>
        <select className="ql-size">
            <option value="10px">10</option>
            <option value="12px">12</option>
            <option value="14px" selected>14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="24px">24</option>
            <option value="36px">36</option>
            <option value="48px">48</option>
            <option value="64px">64</option>
        </select>
        <button className="ql-bold"></button>
        <button className="ql-italic"></button>
        <button className="ql-underline"></button>
        <button className="ql-strike"></button>
        <select className="ql-color"></select>
        <select className="ql-background"></select>
        <button className="ql-list" value="ordered"></button>
        <button className="ql-list" value="bullet"></button>
        <select className="ql-align">
            <option selected></option>
            <option value="center"></option>
            <option value="right"></option>
            <option value="justify"></option>
        </select>
        <button className="ql-indent" value="-1"></button>
        <button className="ql-indent" value="+1"></button>
        <button className="ql-link"></button>
        <button className="ql-image"></button>
        <button className="ql-video"></button>
        <button className="ql-clean"></button>
    </div>
);

const Notes = ({ itineraryId }) => {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (itineraryId) {
            const docRef = doc(db, 'itineraries', itineraryId, 'notes', 'note');
            const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setContent(docSnapshot.data().content);
                } else {
                    console.log('No such document!');
                }
            });
            return () => unsubscribe();
        }
    }, [itineraryId]);

    const handleChange = async (value) => {
        setContent(value);
        const docRef = doc(db, 'itineraries', itineraryId, 'notes', 'note');
        await setDoc(docRef, { content: value }, { merge: true });
    };

    const modules = {
        toolbar: "#toolbar"
    };

    const formats = [
        'font', 'size', 'color', 'background',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'align',
        'link', 'image', 'video', 'indent'
    ];

    return (
        <div className="quill-editor-container">
            <CustomToolbar />
            <ReactQuill
                className="quill-editor"
                value={content}
                onChange={handleChange}
                modules={modules}
                formats={formats}
            />
        </div>
    );
};

export default Notes;