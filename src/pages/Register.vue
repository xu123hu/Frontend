<template>
  <main class="simple-auth"><section class="panel"><p class="eyebrow">创建学生身份</p><h1>注册智学数研</h1><p class="hint">手机号验证后先创建学生账号，教师与科研身份请在登录后提交申请。</p>
    <form @submit.prevent="submit"><PhoneField v-model="phone" /><OtpField v-model="code" :phone="phone" purpose="login" @challenge="challengeId = $event" /><label class="agree"><input v-model="agreed" type="checkbox" /> 我已阅读并同意服务协议与隐私政策</label><button class="btn btn-primary submit" :disabled="loading || !valid">{{ loading ? '创建中…' : '注册并继续' }}</button></form>
    <p class="back"><RouterLink to="/login">已有账号，返回登录</RouterLink></p>
  </section></main>
</template>
<script setup>
import { computed, ref } from 'vue'; import { useRouter } from 'vue-router'; import PhoneField from '@/components/auth/PhoneField.vue'; import OtpField from '@/components/auth/OtpField.vue'; import { useAuthStore } from '@/stores/auth'
const phone=ref(''), code=ref(''), challengeId=ref(''), agreed=ref(false), loading=ref(false); const auth=useAuthStore(), router=useRouter(); const valid=computed(()=>/^1[3-9]\d{9}$/.test(phone.value)&&code.value.length===6&&challengeId.value&&agreed.value)
async function submit(){if(!valid.value||loading.value)return;loading.value=true;try{await auth.loginSms({phone:phone.value,challenge_id:challengeId.value,code:code.value,remember:false});router.push('/onboarding/student')}finally{loading.value=false}}
</script>
<style scoped>.simple-auth{min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,var(--brand-faint),var(--bg))}.panel{width:min(460px,100%);background:white;border:1px solid var(--line);border-radius:24px;padding:34px;box-shadow:var(--shadow-lg)}h1{margin:5px 0 8px}.eyebrow{color:var(--brand-deep);font-weight:800;font-size:12px}.hint{color:var(--ink2);margin-bottom:24px}.agree{display:flex;gap:8px;font-size:12px;color:var(--ink2);margin:12px 0}.submit{width:100%;height:44px}.back{text-align:center;margin-top:18px}.back a{color:var(--brand-deep)}</style>
