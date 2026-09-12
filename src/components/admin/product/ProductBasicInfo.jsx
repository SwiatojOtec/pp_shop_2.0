import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../../../features/admin/ui/admin-ui.css';

const QUILL_MODULES = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
    ],
};

const QUILL_FORMATS = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link', 'image',
];

/**
 * Product basic info section: name, description, instruction, admin notes.
 */
export default function ProductBasicInfo({ formData, onChange }) {
    return (
        <div className="admin-section">
            <h2 className="section-title">Основна інформація</h2>
            <div className="admin-form">
                <div className="form-group">
                    <label>Назва товару</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        placeholder="Наприклад: Chevron Oak Natural"
                    />
                </div>
                <div className="form-group">
                    <label>Опис товару</label>
                    <div className="admin-quill-wrap">
                        <ReactQuill
                            theme="snow"
                            value={formData.desc}
                            onChange={(value, _delta, source) => source === 'user' && onChange('desc', value)}
                            modules={QUILL_MODULES}
                            formats={QUILL_FORMATS}
                            className="admin-quill-editor"
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Інструкція (вкладка на сторінці товару)</label>
                    <div className="admin-quill-wrap">
                        <ReactQuill
                            theme="snow"
                            value={formData.instruction || ''}
                            onChange={(value, _delta, source) => source === 'user' && onChange('instruction', value)}
                            modules={QUILL_MODULES}
                            formats={QUILL_FORMATS}
                            className="admin-quill-editor"
                            placeholder="Інструкція з експлуатації та безпеки праці…"
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label>Нотатки (внутрішні, тільки для адмінів)</label>
                    <textarea
                        value={formData.adminNotes || ''}
                        onChange={(e) => onChange('adminNotes', e.target.value)}
                        rows={4}
                        placeholder="Наприклад: мінімальна ціна, стан, нюанси по оренді, контакт постачальника..."
                    />
                </div>
            </div>
        </div>
    );
}
