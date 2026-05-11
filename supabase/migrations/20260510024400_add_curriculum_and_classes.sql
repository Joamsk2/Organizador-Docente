-- 1. curriculum_modules (Módulos de la planificación)
CREATE TABLE IF NOT EXISTS public.curriculum_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. curriculum_topics (Temas)
CREATE TABLE IF NOT EXISTS public.curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.curriculum_modules(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. class_sessions (La Clase / El Diario)
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR NOT NULL,
  teacher_notes TEXT,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. class_session_topics (Relación M:N)
CREATE TABLE IF NOT EXISTS public.class_session_topics (
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (class_session_id, topic_id)
);

-- 5. class_materials (Materiales de la Clase)
CREATE TABLE IF NOT EXISTS public.class_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL, -- 'file', 'link', 'rich_text'
  title VARCHAR NOT NULL,
  content TEXT, 
  order_index INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. origin_class_session_id in assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS origin_class_session_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.curriculum_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_session_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_materials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "curriculum_modules_own" ON public.curriculum_modules FOR ALL
USING (course_id IN (SELECT id FROM public.courses WHERE school_id IN (SELECT id FROM public.schools WHERE teacher_id = auth.uid())));

CREATE POLICY "curriculum_topics_own" ON public.curriculum_topics FOR ALL
USING (module_id IN (SELECT id FROM public.curriculum_modules WHERE course_id IN (SELECT id FROM public.courses WHERE school_id IN (SELECT id FROM public.schools WHERE teacher_id = auth.uid()))));

CREATE POLICY "class_sessions_own" ON public.class_sessions FOR ALL
USING (course_id IN (SELECT id FROM public.courses WHERE school_id IN (SELECT id FROM public.schools WHERE teacher_id = auth.uid())));

CREATE POLICY "class_session_topics_own" ON public.class_session_topics FOR ALL
USING (class_session_id IN (SELECT id FROM public.class_sessions WHERE course_id IN (SELECT id FROM public.courses WHERE school_id IN (SELECT id FROM public.schools WHERE teacher_id = auth.uid()))));

CREATE POLICY "class_materials_own" ON public.class_materials FOR ALL
USING (class_session_id IN (SELECT id FROM public.class_sessions WHERE course_id IN (SELECT id FROM public.courses WHERE school_id IN (SELECT id FROM public.schools WHERE teacher_id = auth.uid()))));
