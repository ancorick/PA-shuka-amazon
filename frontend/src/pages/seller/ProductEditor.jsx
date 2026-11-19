import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post, patch, del, upload } from '../../api.js';
import { useCategories } from '../../context/CategoriesContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Field, Alert, Spinner, ErrorState, useTitle, TrashIcon, PlusIcon } from '../../components/ui.jsx';

const MAX_IMAGES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function checkFiles(files, already) {
  const ok = [];
  const problems = [];
  for (const f of files) {
    if (!TYPES.includes(f.type)) problems.push(`"${f.name}" is not a JPEG, PNG or WebP image.`);
    else if (f.size > MAX_BYTES) problems.push(`"${f.name}" is larger than 5 MB.`);
    else ok.push(f);
  }
  if (already + ok.length > MAX_IMAGES) {
    problems.push(`A product can have up to ${MAX_IMAGES} images.`);
    ok.splice(MAX_IMAGES - already);
  }
  return { ok, problems };
}

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  useTitle(isNew ? 'Add a product' : 'Edit product');
  const categories = useCategories();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef(null);

  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ title: '', categoryId: '', description: '', priceAmd: '', stock: '1', isPublished: true });
  const [images, setImages] = useState([]); // saved images (edit mode)
  const [queued, setQueued] = useState([]); // { file, url } (new mode)
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [imgError, setImgError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    get(`/seller/products/${id}`).then(({ product: p }) => {
      setForm({
        title: p.title, categoryId: String(p.categoryId), description: p.description,
        priceAmd: String(p.priceAmd), stock: String(p.stock), isPublished: p.isPublished,
      });
      setImages(p.images);
    }).catch(setLoadError).finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => () => queued.forEach((q) => URL.revokeObjectURL(q.url)), [queued]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const imageCount = isNew ? queued.length : images.length;

  async function onFiles(e) {
    const files = [...e.target.files];
    e.target.value = '';
    setImgError(null);
    const { ok, problems } = checkFiles(files, imageCount);
    if (problems.length) setImgError(problems.join(' '));
    if (!ok.length) return;
    if (isNew) {
      setQueued((q) => [...q, ...ok.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
      setErrors((er) => ({ ...er, images: undefined }));
      return;
    }
    setImgBusy(true);
    try {
      const fd = new FormData();
      ok.forEach((f) => fd.append('images', f));
      const data = await upload(`/seller/products/${id}/images`, fd);
      setImages(data.product.images);
      toast(`${ok.length} image${ok.length === 1 ? '' : 's'} uploaded`);
    } catch (err) {
      setImgError(err.message);
    } finally {
      setImgBusy(false);
    }
  }

  async function removeImage(index) {
    setImgError(null);
    if (isNew) { setQueued((q) => q.filter((_, i) => i !== index)); return; }
    setImgBusy(true);
    try {
      const data = await del(`/seller/products/${id}/images/${images[index].id}`);
      setImages(data.product.images);
    } catch (err) {
      setImgError(err.message);
    } finally {
      setImgBusy(false);
    }
  }

  async function makeMain(index) {
    if (index === 0) return;
    if (isNew) {
      setQueued((q) => [q[index], ...q.filter((_, i) => i !== index)]);
      return;
    }
    const order = [images[index].id, ...images.filter((_, i) => i !== index).map((im) => im.id)];
    setImgBusy(true);
    try {
      const data = await patch(`/seller/products/${id}`, { imageOrder: order });
      setImages(data.product.images);
    } catch (err) {
      setImgError(err.message);
    } finally {
      setImgBusy(false);
    }
  }

  function validate() {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    if (!form.categoryId) e.categoryId = 'Choose a category.';
    if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters.';
    const price = Number(String(form.priceAmd).replace(/[\s,]/g, ''));
    if (!Number.isInteger(price) || price < 1) e.priceAmd = 'Enter a price in whole dram, e.g. 12500.';
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0) e.stock = 'Stock must be 0 or more.';
    if (form.isPublished && imageCount === 0) e.images = 'Add at least one photo to publish the product.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(e) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSaving(true);
    const body = {
      title: form.title.trim(),
      categoryId: Number(form.categoryId),
      description: form.description.trim(),
      priceAmd: Number(String(form.priceAmd).replace(/[\s,]/g, '')),
      stock: Number(form.stock),
    };
    try {
      if (isNew) {
        const { product } = await post('/seller/products', body);
        if (queued.length) {
          const fd = new FormData();
          queued.forEach((q) => fd.append('images', q.file));
          try {
            await upload(`/seller/products/${product.id}/images`, fd);
          } catch (err) {
            toast('Product saved as a draft, but the images failed to upload.', 'danger');
            navigate(`/seller/products/${product.id}/edit`, { replace: true });
            setImgError(err.message);
            return;
          }
        }
        if (form.isPublished) await patch(`/seller/products/${product.id}`, { isPublished: true });
        toast(form.isPublished ? 'Product published!' : 'Product saved as a draft.');
        navigate('/seller/products');
      } else {
        await patch(`/seller/products/${id}`, { ...body, isPublished: form.isPublished });
        toast('Changes saved');
        navigate('/seller/products');
      }
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (loadError) return <ErrorState error={loadError} />;

  const shown = isNew ? queued.map((q) => ({ key: q.url, src: q.url })) : images.map((im) => ({ key: im.id, src: im.thumb }));

  return (
    <div className="editor">
      <div className="panel-head">
        <h1>{isNew ? 'Add a product' : 'Edit product'}</h1>
        {!isNew && <Link to={`/p/${id}`}>View on storefront ›</Link>}
      </div>
      <form className="editor-grid" onSubmit={save} noValidate>
        <div className="card-panel">
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Field label="Product title" error={errors.title} id="title">
            <input id="title" value={form.title} onChange={set('title')} maxLength={150} placeholder="e.g. Handmade Copper Jazzve, 300 ml" />
          </Field>
          <Field label="Category" error={errors.categoryId} id="cat">
            <select id="cat" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Choose a category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Description" error={errors.description} id="desc">
            <textarea id="desc" rows={7} value={form.description} onChange={set('description')} maxLength={5000} placeholder="Describe the product: materials, size, condition, what's in the box…" />
          </Field>
          <div className="form-row">
            <Field label="Price (AMD, ֏)" error={errors.priceAmd} id="price">
              <input id="price" inputMode="numeric" value={form.priceAmd} onChange={set('priceAmd')} placeholder="12500" />
            </Field>
            <Field label="Stock (units)" error={errors.stock} id="stock">
              <input id="stock" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} />
            </Field>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.isPublished} onChange={set('isPublished')} />
            <span><strong>Published</strong> — visible to buyers. Unpublish to hide it (products are never deleted).</span>
          </label>
        </div>

        <div className="card-panel">
          <h3>Images <span className="muted small">({imageCount}/{MAX_IMAGES})</span></h3>
          <p className="small muted">JPEG, PNG or WebP, up to 5 MB each. The first image is the main image.</p>
          {imgError && <Alert tone="danger">{imgError}</Alert>}
          {errors.images && <div className="field-error">⚠ {errors.images}</div>}
          <div className={`img-grid ${imgBusy ? 'is-busy' : ''}`}>
            {shown.map((im, i) => (
              <div key={im.key} className={`img-slot ${i === 0 ? 'main' : ''}`}>
                <img src={im.src} alt="" />
                {i === 0 ? <span className="img-main-tag">Main</span>
                  : <button type="button" className="img-btn img-make-main" onClick={() => makeMain(i)}>Make main</button>}
                <button type="button" className="img-btn img-del" onClick={() => removeImage(i)} aria-label="Remove image"><TrashIcon size={16} /></button>
              </div>
            ))}
            {imageCount < MAX_IMAGES && (
              <button type="button" className="img-add" onClick={() => fileInput.current?.click()} disabled={imgBusy}>
                <PlusIcon size={28} />
                <span>{imgBusy ? 'Uploading…' : 'Add photos'}</span>
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFiles} />
          <hr />
          <button className="btn btn-cart btn-block" disabled={saving || imgBusy}>{saving ? 'Saving…' : isNew ? 'Save product' : 'Save changes'}</button>
          <Link to="/seller/products" className="btn btn-secondary btn-block mt-s">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
