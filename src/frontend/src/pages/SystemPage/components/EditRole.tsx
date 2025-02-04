import { useContext, useEffect, useRef, useState } from "react";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/ui/table";
import { Switch } from "../../../components/ui/switch";
import { useDebounce } from "../../../util/hook";
import { Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { alertContext } from "../../../contexts/alertContext";
import { createRole, getRoleLibsApi, getRolePermissionsApi, getRoleSkillsApi, updateRoleNameApi, updateRolePermissionsApi } from "../../../controllers/API/user";

const pageSize = 10
const SearchPanne = ({ title, total, onChange, children }) => {
    const [page, setPage] = useState(1)
    const pageCount = Math.ceil(total / pageSize)
    const searchKeyRef = useRef('')

    const handleSearch = useDebounce((e) => {
        searchKeyRef.current = e.target.value
        setPage(1)
        onChange(1, searchKeyRef.current)
    }, 500, false)

    const loadPage = (page) => {
        setPage(page)
        onChange(page, searchKeyRef.current)
    }

    return <>
        <div className="mt-20 flex justify-between items-center relative">
            <p className="font-bold">{title}</p>
            <Input className="w-[300px] rounded-full" onChange={handleSearch}></Input>
            <Search className="absolute right-2" color="#999" />
        </div>
        <div className="mt-4">
            {children}
        </div>
        <div className="join grid grid-cols-2 w-[200px] mx-auto my-4">
            <button disabled={page === 1} className="join-item btn btn-outline btn-xs" onClick={() => loadPage(page - 1)}>上一页</button>
            <button disabled={page >= pageCount} className="join-item btn btn-outline btn-xs" onClick={() => loadPage(page + 1)}>下一页</button>
        </div>
    </>

}


// -1 id表示新增
export default function EditRole({ id, name, onChange }) {
    const { setErrorData, setSuccessData } = useContext(alertContext);

    const [form, setForm] = useState({
        name,
        useSkills: [],
        useLibs: [],
        manageLibs: []
    })
    useEffect(() => {
        if (id !== -1) {
            // 获取详情
            getRolePermissionsApi(id).then(res => {
                const useSkills = [], useLibs = [], manageLibs = []
                res.data.data.forEach(item => {
                    switch (item.type) {
                        case 1: useLibs.push(Number(item.third_id)); break;
                        case 2: useSkills.push(item.third_id); break;
                        case 3: manageLibs.push(Number(item.third_id)); break;
                    }
                })
                setForm({ name, useSkills, useLibs, manageLibs })
            })
        }
    }, [id])

    const switchDataChange = (id, key, checked) => {
        const index = form[key].findIndex(el => el === id)
        checked && index === -1 && form[key].push(id)
        !checked && index !== -1 && form[key].splice(index, 1)
        setForm({ ...form, [key]: form[key] })
    }

    // 知识库管理权限switch
    const switchLibManage = (id, checked) => {
        switchDataChange(id, 'manageLibs', checked)
        if (checked) switchDataChange(id, 'useLibs', checked)
    }
    // 知识库使用权限switch
    const switchUseLib = (id, checked) => {
        if (!checked && form.manageLibs.includes(id)) return
        switchDataChange(id, 'useLibs', checked)
    }

    const { data: skillData, change: handleSkillChange } = usePageData<any>(id, 'skill')
    const { data: libData, change: handleLibChange } = usePageData<any>(id, 'lib')

    const handleSave = async () => {
        if (form.name.length > 50) {
            return setErrorData({
                title: "提示",
                list: ['角色名称不能超过50字符'],
            });
        }
        // 新增先创建角色
        let roleId = id
        if (id === -1) {
            const res = await createRole(form.name)
            roleId = res.data.data.id
        } else {
            // 更新基本信息
            updateRoleNameApi(roleId, form.name)
        }
        // 更新角色权限
        const res = await Promise.all([
            updateRolePermissionsApi({ role_id: roleId, access_id: form.useSkills, type: 2 }),
            updateRolePermissionsApi({ role_id: roleId, access_id: form.useLibs, type: 1 }),
            updateRolePermissionsApi({ role_id: roleId, access_id: form.manageLibs, type: 3 })
        ])

        console.log('form :>> ', form, res);
        setSuccessData({ title: '保存成功' })
        onChange(true)
    }

    return <div className="max-w-[600px] mx-auto pt-4">
        <div className="font-bold mt-4">
            <p className="mb-4">角色名称</p>
            <Input placeholder="角色名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60}></Input>
        </div>
        <div className="">
            <SearchPanne title='技能授权' total={skillData.total} onChange={handleSkillChange}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>技能名称</TableHead>
                            <TableHead className="w-[100px]">创建人</TableHead>
                            <TableHead className="text-right">使用权限</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {skillData.data.map((el) => (
                            <TableRow key={el.id}>
                                <TableCell className="font-medium">{el.name}</TableCell>
                                <TableCell>{el.user_id}</TableCell>
                                <TableCell className="text-right">
                                    <Switch checked={form.useSkills.includes(el.id)} onCheckedChange={(bln) => switchDataChange(el.id, 'useSkills', bln)} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </SearchPanne>
        </div>
        <div className="">
            <SearchPanne title='知识库授权' total={libData.total} onChange={handleLibChange}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>知识库名称</TableHead>
                            <TableHead className="w-[100px]">创建人</TableHead>
                            <TableHead className="text-right">使用权限</TableHead>
                            <TableHead className="text-right">管理权限</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {libData.data.map((el) => (
                            <TableRow key={el.id}>
                                <TableCell className="font-medium">{el.name}</TableCell>
                                <TableCell>{el.user_id}</TableCell>
                                <TableCell className="text-right">
                                    <Switch checked={form.useLibs.includes(el.id)} onCheckedChange={(bln) => switchUseLib(el.id, bln)} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Switch checked={form.manageLibs.includes(el.id)} onCheckedChange={(bln) => switchLibManage(el.id, bln)} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </SearchPanne>
        </div>
        <div className="flex justify-center gap-4 mt-16">
            <Button variant="outline" className="h-8 rounded-full px-16" onClick={() => onChange()}>取消</Button>
            <Button className="h-8 rounded-full px-16" onClick={handleSave}>保存</Button>
        </div>
    </div>

}

const usePageData = <T,>(id: number, key: 'skill' | 'lib') => {
    const [data, setData] = useState<{ data: T[], total: number }>({ data: [], total: 0 })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async (page = 1, keyword = '') => {
        const param = {
            name: keyword,
            role_id: id === -1 ? 0 : id,
            page_num: page,
            page_size: pageSize
        }
        const res = key === 'skill' ? await getRoleSkillsApi(param) : await getRoleLibsApi(param)
        setData(res.data)
    }

    return {
        data,
        change: loadData
    }
}