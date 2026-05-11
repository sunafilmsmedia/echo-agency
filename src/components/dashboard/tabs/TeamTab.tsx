import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus, X, ExternalLink, Video, Calendar, Clock,
  Trash2, Hash, Loader2, Send, Mic, Paperclip,
  FileText, Download, Square, Play, Pause,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Channel { id: string; name: string; description: string | null; created_by: string; created_at: string; }
interface Message {
  id: string; channel_id: string; user_id: string; user_email: string;
  content: string; created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null; // 'image' | 'audio' | 'file'
  attachment_name?: string | null;
}
interface Meeting  { id: string; title: string; description: string | null; scheduled_at: string; duration_minutes: number; meet_link: string | null; created_by: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayName(email: string) { return email?.split("@")[0] ?? "Membre"; }
function initials(email: string)    { return (email?.charAt(0) ?? "?").toUpperCase(); }
const COLORS = ["bg-primary/20 text-primary","bg-emerald-500/20 text-emerald-400","bg-amber-500/20 text-amber-400","bg-blue-500/20 text-blue-400","bg-purple-500/20 text-purple-400"];
function avatarColor(s: string) { let n=0; for(let i=0;i<s.length;i++) n+=s.charCodeAt(i); return COLORS[n%COLORS.length]; }
function formatTime(iso: string) {
  const d = new Date(iso), now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const t = d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return t;
  const yd = new Date(now); yd.setDate(now.getDate()-1);
  if (d.toDateString() === yd.toDateString()) return `Hier ${t}`;
  return d.toLocaleDateString("fr-CA", { day:"numeric", month:"short" }) + ` ${t}`;
}
function formatMeetDate(iso: string) {
  const d = new Date(iso), now = new Date(), t = d.toLocaleTimeString("fr-CA",{hour:"2-digit",minute:"2-digit"});
  const tm = new Date(now); tm.setDate(now.getDate()+1);
  if (d.toDateString()===now.toDateString()) return `Aujourd'hui · ${t}`;
  if (d.toDateString()===tm.toDateString()) return `Demain · ${t}`;
  return d.toLocaleDateString("fr-CA",{weekday:"short",day:"numeric",month:"short"})+` · ${t}`;
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useChannels() {
  return useQuery({ queryKey:["channels"], queryFn: async ():Promise<Channel[]> => {
    const {data,error} = await supabase.from("channels").select("*").order("created_at",{ascending:true});
    if(error) throw error; return data??[];
  }});
}
function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({name,description}:{name:string;description?:string}) => {
    const {data:{user}} = await supabase.auth.getUser();
    const {error} = await supabase.from("channels").insert({name:name.toLowerCase().replace(/\s+/g,"-"),description:description??null,created_by:user!.id});
    if(error) throw error;
  }, onSuccess:()=>qc.invalidateQueries({queryKey:["channels"]})});
}
function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async(id:string)=>{ const{error}=await supabase.from("channels").delete().eq("id",id); if(error)throw error; },
    onSuccess:()=>qc.invalidateQueries({queryKey:["channels"]})});
}

function useMessages(channelId:string|null) {
  const qc = useQueryClient();
  // Subscribe to new messages in real-time
  useEffect(()=>{
    if(!channelId) return;
    const ch = supabase.channel(`room:${channelId}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`channel_id=eq.${channelId}`},
        (payload)=>{
          qc.setQueryData(["messages",channelId],(old:Message[]=[])=>[...old, payload.new as Message]);
        })
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[channelId,qc]);

  return useQuery({ queryKey:["messages",channelId], enabled:!!channelId,
    queryFn: async():Promise<Message[]> => {
      const{data,error}=await supabase.from("messages").select("*").eq("channel_id",channelId!).order("created_at",{ascending:true}).limit(200);
      if(error) throw error; return data??[];
    }, staleTime: Infinity }); // don't refetch — realtime handles updates
}

function useSendMessage() {
  return useMutation({ mutationFn: async(p:{
    channelId:string; content:string;
    attachment_url?:string; attachment_type?:string; attachment_name?:string;
  })=>{
    const{data:{user}}=await supabase.auth.getUser();
    const{error}=await supabase.from("messages").insert({
      channel_id:p.channelId, user_id:user!.id, user_email:user!.email, content:p.content,
      attachment_url:p.attachment_url??null, attachment_type:p.attachment_type??null, attachment_name:p.attachment_name??null,
    });
    if(error) throw error;
  }});
}

// Upload a file to Supabase Storage and return its public URL
async function uploadFile(file: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return data.publicUrl;
}

function useMeetings() {
  return useQuery({ queryKey:["meetings"], queryFn: async():Promise<Meeting[]>=>{
    const{data,error}=await supabase.from("meetings").select("*").gte("scheduled_at",new Date(Date.now()-86400000).toISOString()).order("scheduled_at",{ascending:true});
    if(error) throw error; return data??[];
  }});
}
function useCreateMeeting() {
  const qc=useQueryClient();
  return useMutation({ mutationFn:async(p:{title:string;scheduled_at:string;duration_minutes?:number;meet_link?:string;description?:string})=>{
    const{data:{user}}=await supabase.auth.getUser();
    const{error}=await supabase.from("meetings").insert({...p,created_by:user!.id});
    if(error) throw error;
  }, onSuccess:()=>qc.invalidateQueries({queryKey:["meetings"]})});
}
function useDeleteMeeting() {
  const qc=useQueryClient();
  return useMutation({ mutationFn:async(id:string)=>{ const{error}=await supabase.from("meetings").delete().eq("id",id); if(error)throw error; },
    onSuccess:()=>qc.invalidateQueries({queryKey:["meetings"]})});
}

// ── Create Channel Modal ──────────────────────────────────────────────────────

function CreateChannelModal({onClose}:{onClose:()=>void}) {
  const [name,setName]=useState(""); const [desc,setDesc]=useState("");
  const create=useCreateChannel();
  const submit=async()=>{
    if(!name.trim()){toast.error("Entre un nom");return;}
    try{ await create.mutateAsync({name:name.trim(),description:desc.trim()||undefined}); toast.success("Canal créé"); onClose(); }
    catch(e:any){ toast.error(e?.message?.includes("does not exist") ? "Lance d'abord la migration SQL dans Supabase" : (e?.message ?? "Erreur lors de la création")); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-sm"><CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Nouveau canal</p>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground"/></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nom</label>
            <div className="flex items-center gap-1.5 border border-input rounded-md px-3 h-9 focus-within:ring-1 focus-within:ring-ring">
              <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
              <input autoFocus placeholder="général, clients, contenu..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"/>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Description (optionnel)</label>
            <Input placeholder="À quoi sert ce canal?" value={desc} onChange={e=>setDesc(e.target.value)} className="h-9 text-sm"/>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1" onClick={submit} disabled={create.isPending}>
            {create.isPending?<Loader2 className="w-4 h-4 animate-spin"/>:"Créer"}
          </Button>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ── Create Meeting Modal ──────────────────────────────────────────────────────

function CreateMeetingModal({onClose}:{onClose:()=>void}) {
  const [title,setTitle]=useState(""); const [date,setDate]=useState(""); const [time,setTime]=useState("");
  const [dur,setDur]=useState("60"); const [link,setLink]=useState(""); const [desc,setDesc]=useState("");
  const create=useCreateMeeting();
  const submit=async()=>{
    if(!title.trim()||!date||!time){toast.error("Titre, date et heure requis");return;}
    try{ await create.mutateAsync({title:title.trim(),scheduled_at:new Date(`${date}T${time}`).toISOString(),duration_minutes:parseInt(dur)||60,meet_link:link.trim()||undefined,description:desc.trim()||undefined});
      toast.success("Meeting créé"); onClose(); }
    catch{ toast.error("Erreur. Réessaie."); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-sm"><CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">Nouveau meeting</p>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground"/></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1"><label className="text-xs text-muted-foreground">Titre</label>
            <Input autoFocus placeholder="Kickoff client, Réunion équipe..." value={title} onChange={e=>setTitle(e.target.value)} className="h-9 text-sm"/></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={e=>setDate(e.target.value)} className="h-9 text-sm"/></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Heure</label>
              <Input type="time" value={time} onChange={e=>setTime(e.target.value)} className="h-9 text-sm"/></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Durée</label>
              <select value={dur} onChange={e=>setDur(e.target.value)} className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground">
                <option value="30">30 min</option><option value="60">1h</option><option value="90">1h30</option><option value="120">2h</option>
              </select></div>
            <div className="space-y-1"><label className="text-xs text-muted-foreground">Lien Meet/Zoom</label>
              <Input placeholder="https://meet.google.com/..." value={link} onChange={e=>setLink(e.target.value)} className="h-9 text-sm"/></div>
          </div>
          <div className="space-y-1"><label className="text-xs text-muted-foreground">Description</label>
            <Input placeholder="Ordre du jour..." value={desc} onChange={e=>setDesc(e.target.value)} className="h-9 text-sm"/></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Annuler</Button>
          <Button className="flex-1" onClick={submit} disabled={create.isPending}>
            {create.isPending?<Loader2 className="w-4 h-4 animate-spin"/>:"Créer"}
          </Button>
        </div>
      </CardContent></Card>
    </div>
  );
}

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 w-48 mt-1">
      <button onClick={toggle} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors">
        {playing ? <Pause className="w-3 h-3 text-primary-foreground"/> : <Play className="w-3 h-3 text-primary-foreground ml-0.5"/>}
      </button>
      <div className="flex-1 space-y-1">
        <div className="h-1 rounded-full bg-border overflow-hidden cursor-pointer"
          onClick={e=>{ const rect=e.currentTarget.getBoundingClientRect(); const a=audioRef.current; if(a&&duration){ a.currentTime=((e.clientX-rect.left)/rect.width)*duration; }}}>
          <div className="h-full bg-primary rounded-full transition-all" style={{width:`${progress}%`}}/>
        </div>
        <span className="text-[10px] text-muted-foreground">{fmt(duration*progress/100||0)} / {fmt(duration)}</span>
      </div>
      <audio ref={audioRef} src={url} preload="metadata"
        onLoadedMetadata={e=>setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={e=>{ const a=e.target as HTMLAudioElement; setProgress(a.duration?(a.currentTime/a.duration)*100:0); }}
        onEnded={()=>{ setPlaying(false); setProgress(0); }}/>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageAttachment({ msg }: { msg: Message }) {
  if (!msg.attachment_url) return null;
  if (msg.attachment_type === "image") {
    return (
      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img src={msg.attachment_url} alt={msg.attachment_name??""} className="max-w-xs max-h-64 rounded-xl object-cover border border-border/40 hover:opacity-90 transition-opacity cursor-zoom-in"/>
      </a>
    );
  }
  if (msg.attachment_type === "audio") {
    return <AudioPlayer url={msg.attachment_url}/>;
  }
  // Generic file
  return (
    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" download={msg.attachment_name??undefined}
      className="inline-flex items-center gap-2 bg-muted/50 border border-border/40 rounded-xl px-3 py-2 mt-1.5 hover:border-primary/40 transition-colors max-w-xs">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-primary"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{msg.attachment_name ?? "Fichier"}</p>
        <p className="text-[10px] text-muted-foreground">Télécharger</p>
      </div>
      <Download className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
    </a>
  );
}

// ── Messages View ─────────────────────────────────────────────────────────────

function MessagesView({channel}:{channel:Channel}) {
  const {data:messages=[],isLoading} = useMessages(channel.id);
  const send = useSendMessage();
  const [input,setInput]=useState("");
  const [myEmail,setMyEmail]=useState("");
  const [uploading,setUploading]=useState(false);

  // Voice recording state
  const [recording,setRecording]=useState(false);
  const [recDuration,setRecDuration]=useState(0);
  const mediaRecRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const recTimerRef=useRef<ReturnType<typeof setInterval>|null>(null);

  const fileInputRef=useRef<HTMLInputElement>(null);
  const bottomRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ supabase.auth.getUser().then(({data})=>setMyEmail(data.user?.email??"")); },[]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),80); },[channel.id]);

  // ── Send text ──────────────────────────────────────────────────────────────
  const handleSend=async()=>{
    const content=input.trim(); if(!content||send.isPending) return;
    setInput("");
    try{ await send.mutateAsync({channelId:channel.id,content}); }
    catch(e:any){ toast.error(e?.message??"Erreur d'envoi"); setInput(content); }
  };

  // ── Upload file ────────────────────────────────────────────────────────────
  const handleFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    e.target.value="";
    setUploading(true);
    try{
      const ext=file.name.split(".").pop();
      const path=`${channel.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const url=await uploadFile(file,path);
      const isImage=file.type.startsWith("image/");
      await send.mutateAsync({channelId:channel.id,content:"",attachment_url:url,attachment_type:isImage?"image":"file",attachment_name:file.name});
    } catch(e:any){
      toast.error(e?.message?.includes("Bucket not found")?"Crée le bucket 'chat-attachments' dans Supabase Storage":"Erreur upload: "+e?.message);
    } finally{ setUploading(false); }
  };

  // ── Voice record ───────────────────────────────────────────────────────────
  const startRecording=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":"audio/ogg";
      const mr=new MediaRecorder(stream,{mimeType});
      mediaRecRef.current=mr;
      chunksRef.current=[];
      mr.ondataavailable=e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(chunksRef.current,{type:mimeType});
        setUploading(true);
        try{
          const path=`${channel.id}/voice-${Date.now()}.${mimeType.includes("webm")?"webm":"ogg"}`;
          const url=await uploadFile(blob,path);
          await send.mutateAsync({channelId:channel.id,content:"",attachment_url:url,attachment_type:"audio",attachment_name:"Message vocal"});
        } catch(e:any){
          toast.error(e?.message?.includes("Bucket not found")?"Crée le bucket 'chat-attachments' dans Supabase Storage":"Erreur upload vocal");
        } finally{ setUploading(false); }
      };
      mr.start(100);
      setRecording(true);
      setRecDuration(0);
      recTimerRef.current=setInterval(()=>setRecDuration(d=>d+1),1000);
    } catch{
      toast.error("Accès au microphone refusé");
    }
  };

  const stopRecording=()=>{
    mediaRecRef.current?.stop();
    if(recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    setRecDuration(0);
  };

  const cancelRecording=()=>{
    if(mediaRecRef.current){
      mediaRecRef.current.ondataavailable=null;
      mediaRecRef.current.onstop=null;
      mediaRecRef.current.stop();
      mediaRecRef.current.stream?.getTracks().forEach(t=>t.stop());
    }
    if(recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    setRecDuration(0);
  };

  const fmtSec=(s:number)=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  // Group consecutive messages from same sender (within 5 min)
  const grouped=messages.map((msg,i)=>{
    const prev=messages[i-1];
    const showHeader=!prev||prev.user_email!==msg.user_email||
      new Date(msg.created_at).getTime()-new Date(prev.created_at).getTime()>5*60*1000;
    return {...msg,showHeader};
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40 flex-shrink-0">
        <Hash className="w-4 h-4 text-muted-foreground"/>
        <span className="font-semibold text-sm">{channel.name}</span>
        {channel.description&&<span className="text-xs text-muted-foreground border-l border-border/40 pl-2.5">{channel.description}</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
        {isLoading?(
          <div className="flex justify-center pt-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/></div>
        ):messages.length===0?(
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 pb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Hash className="w-6 h-6 text-primary/50"/>
            </div>
            <p className="font-semibold text-sm text-foreground">Début de #{channel.name}</p>
            <p className="text-xs text-muted-foreground">Envoie un message, une image ou un vocal</p>
          </div>
        ):(
          grouped.map((msg)=>{
            const isMe=msg.user_email===myEmail;
            const email=msg.user_email??"membre";
            return (
              <div key={msg.id} className={msg.showHeader?"mt-5":"mt-0.5"}>
                {msg.showHeader&&(
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(email)}`}>
                      {initials(email)}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{isMe?"Toi":displayName(email)}</span>
                    <span className="text-[11px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                  </div>
                )}
                <div className="pl-[42px]">
                  {msg.content&&<p className="text-sm text-foreground leading-relaxed break-words">{msg.content}</p>}
                  <MessageAttachment msg={msg}/>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input area */}
      <div className="px-5 py-3 border-t border-border/40 flex-shrink-0">
        {recording?(
          /* Recording indicator */
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0"/>
            <span className="text-sm text-red-400 font-medium flex-1">Enregistrement... {fmtSec(recDuration)}</span>
            <button onClick={cancelRecording} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-4 h-4"/>
            </button>
            <button onClick={stopRecording}
              className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
              <Square className="w-3 h-3 fill-current"/> Envoyer
            </button>
          </div>
        ):(
          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/40 focus-within:border-primary/40 transition-colors">
            {/* Attach file */}
            <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40">
              {uploading?<Loader2 className="w-4 h-4 animate-spin"/>:<Paperclip className="w-4 h-4"/>}
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"/>

            {/* Text input */}
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} }}
              placeholder={`Message #${channel.name}`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"/>

            {/* Voice record */}
            <button onClick={startRecording} disabled={uploading}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40">
              <Mic className="w-4 h-4"/>
            </button>

            {/* Send */}
            <button onClick={handleSend} disabled={!input.trim()||send.isPending}
              className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-30 hover:bg-primary/90 transition-colors">
              <Send className="w-3.5 h-3.5 text-primary-foreground"/>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Meetings View ─────────────────────────────────────────────────────────────

function MeetingsView({onNew}:{onNew:()=>void}) {
  const {data:meetings=[],isLoading}=useMeetings();
  const del=useDeleteMeeting();
  const upcoming=meetings.filter(m=>new Date(m.scheduled_at)>=new Date());
  const past=meetings.filter(m=>new Date(m.scheduled_at)<new Date());

  const MeetCard=({m}:{m:Meeting})=>(
    <Card className="border-border/50 group hover:border-border/80 transition-colors">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-primary"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{m.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatMeetDate(m.scheduled_at)}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/>{m.duration_minutes} min</span>
              {m.description&&<span className="text-xs text-muted-foreground truncate">{m.description}</span>}
            </div>
            {m.meet_link&&(
              <Button size="sm" variant="outline" className="mt-2 h-7 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={()=>window.open(m.meet_link!,"_blank")}>
                <Video className="w-3 h-3"/> Rejoindre <ExternalLink className="w-3 h-3"/>
              </Button>
            )}
          </div>
          <button onClick={()=>del.mutate(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0">
            <Trash2 className="w-4 h-4"/>
          </button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 flex-shrink-0">
        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground"/><span className="font-semibold text-sm">Meetings</span></div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            onClick={()=>window.open("https://meet.google.com/new","_blank")}>
            <Video className="w-3.5 h-3.5"/> Meet instantané <ExternalLink className="w-3.5 h-3.5"/>
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={onNew}><Plus className="w-3.5 h-3.5"/> Planifier</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5 max-w-2xl">
        {isLoading ? <div className="flex justify-center pt-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/></div>
        : upcoming.length===0&&past.length===0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 pb-8">
            <Calendar className="w-10 h-10 text-muted-foreground/20"/>
            <p className="text-sm text-muted-foreground">Aucun meeting planifié</p>
            <Button size="sm" onClick={onNew}><Plus className="w-3.5 h-3.5 mr-1.5"/>Planifier un meeting</Button>
          </div>
        ) : (
          <>
            {upcoming.length>0&&<div className="space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">À venir</p>
              {upcoming.map(m=><MeetCard key={m.id} m={m}/>)}
            </div>}
            {past.length>0&&<div className="space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Passés</p>
              {past.map(m=>(
                <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-50 group hover:opacity-70 transition-opacity">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{formatMeetDate(m.scheduled_at)}</p>
                  </div>
                  <button onClick={()=>del.mutate(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TeamTab() {
  const {data:channels=[],isLoading:chLoading}=useChannels();
  const delChannel=useDeleteChannel();
  const [selected,setSelected]=useState<Channel|null>(null);
  const [panel,setPanel]=useState<"chat"|"meetings">("chat");
  const [showAddCh,setShowAddCh]=useState(false);
  const [showAddMeet,setShowAddMeet]=useState(false);

  useEffect(()=>{ if(channels.length>0&&!selected) setSelected(channels[0]); },[channels]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-border/40 bg-sidebar">
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Canaux</span>
              <button onClick={()=>setShowAddCh(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                <Plus className="w-3.5 h-3.5"/>
              </button>
            </div>
            {chLoading ? <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground"/></div>
            : channels.length===0 ? (
              <button onClick={()=>setShowAddCh(true)} className="w-full text-left text-xs text-muted-foreground hover:text-primary py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
                + Créer un canal
              </button>
            ) : channels.map(ch=>(
              <div key={ch.id} className="group flex items-center">
                <button onClick={()=>{setSelected(ch);setPanel("chat");}}
                  className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors ${panel==="chat"&&selected?.id===ch.id?"bg-sidebar-accent text-sidebar-foreground font-medium":"text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                  <Hash className="w-3.5 h-3.5 flex-shrink-0"/><span className="truncate">{ch.name}</span>
                </button>
                <button onClick={()=>{delChannel.mutate(ch.id);if(selected?.id===ch.id)setSelected(null);}}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all mr-1 flex-shrink-0">
                  <Trash2 className="w-3 h-3"/>
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border/40 p-3">
          <button onClick={()=>setPanel("meetings")}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${panel==="meetings"?"bg-sidebar-accent text-sidebar-foreground font-medium":"text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
            <Calendar className="w-4 h-4 flex-shrink-0"/>Meetings
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-hidden">
        {panel==="meetings" ? <MeetingsView onNew={()=>setShowAddMeet(true)}/>
        : selected ? <MessagesView channel={selected}/>
        : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground p-8">
            <Hash className="w-10 h-10 opacity-20"/>
            <p className="text-sm font-medium text-foreground">Sélectionne ou crée un canal</p>
            <Button size="sm" onClick={()=>setShowAddCh(true)}><Plus className="w-3.5 h-3.5 mr-1.5"/>Créer un canal</Button>
          </div>
        )}
      </div>

      {showAddCh&&<CreateChannelModal onClose={()=>setShowAddCh(false)}/>}
      {showAddMeet&&<CreateMeetingModal onClose={()=>setShowAddMeet(false)}/>}
    </div>
  );
}
