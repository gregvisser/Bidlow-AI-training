import { createCourse } from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CourseCreateForm() {
  return (
    <form action={createCourse} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" placeholder="my-course" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <select
            id="provider"
            name="provider"
            className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
            defaultValue="AZURE"
          >
            <option value="AZURE">Azure</option>
            <option value="HUGGING_FACE">Hugging Face</option>
            <option value="CURSOR">Cursor</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input id="subtitle" name="subtitle" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedMinutes">Estimated minutes</Label>
          <Input id="estimatedMinutes" name="estimatedMinutes" type="number" defaultValue={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
            defaultValue="DRAFT"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricingModel">Pricing model</Label>
          <select
            id="pricingModel"
            name="pricingModel"
            className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm"
            defaultValue="included"
          >
            <option value="included">Included</option>
            <option value="subscription">Subscription</option>
            <option value="one_time">One-time</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" className="rounded border-white/20" />
            Public catalog
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" className="rounded border-white/20" />
            Featured
          </label>
        </div>
      </div>
      <Button type="submit">Create course</Button>
    </form>
  );
}
